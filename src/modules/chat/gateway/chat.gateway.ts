import { ServerWebSocket } from "bun";
import { ConnectionManager } from "./connection.manager";
import { MessageService } from "../services/message.service";
import { ThreadService } from "../services/thread.service";
import { ChannelMemberService } from "../services/channel-member.service";
import { MessageEventEmitter, MessageCreatedEvent, MessageDeletedEvent } from "../services/message-event.emitter";
import { createMessageDto } from "../dtos/create-message.dto";
import { ServerNewMessageEvent, ServerMessageDeletedEvent, ClientMessage } from "../types/websocket-messages";
import { users } from "../../../db/schema/users.entity";

type User = typeof users.$inferSelect;

/**
 * ChatGateway
 * 
 * Implementa Server-Driven State Synchronization con Threads:
 * 1. El servidor es la ÚNICA FUENTE DE VERDAD
 * 2. Los clientes se suscriben a THREADS específicos
 * 3. Los mensajes pertenecen a threads dentro de canales
 * 
 * Flujo:
 * 1. Cliente: Se une a un thread via WebSocket (JOIN_THREAD)
 * 2. Cliente: POST /api/messages con threadId
 * 3. Servidor: Guarda en BD
 * 4. Servidor: Emite evento MESSAGE_CREATED por EventEmitter
 * 5. Gateway: Broadcast a todos los usuarios suscritos al thread
 * 6. Cliente: Recibe por WebSocket y actualiza UI
 */
export class ChatGateway {
    // Mapeo: userId -> conjunto de threadIds a los que está suscrito
    private userThreads: Map<string, Set<string>> = new Map();
    
    // Mapeo: threadId -> callback del EventEmitter para mensajes creados
    // UNA ÚNICA suscripción por thread (no por usuario)
    private threadSubscriptions: Map<string, (event: MessageCreatedEvent) => void> = new Map();
    
    // Mapeo: threadId -> callback del EventEmitter para mensajes eliminados
    private threadDeleteSubscriptions: Map<string, (event: MessageDeletedEvent) => void> = new Map();

    constructor(
        private readonly connectionManager: ConnectionManager,
        private readonly messageService: MessageService,
        private readonly threadService: ThreadService,
        private readonly channelMemberService: ChannelMemberService,
        private readonly eventEmitter: MessageEventEmitter
    ) { }

    handleConnection(ws: ServerWebSocket<{ user: User }>) {
        const userId = ws.data.user.id;
        this.connectionManager.addConnection(userId, ws);
        
        // Inicializar el Set de threads para este usuario si no existe
        if (!this.userThreads.has(userId)) {
            this.userThreads.set(userId, new Set());
        }
        
        console.log(`✅ [WebSocket] User ${userId} connected (Total: ${this.connectionManager.getConnectedUsers().length} users)`);
    }

    handleDisconnect(ws: ServerWebSocket<{ user: User }>) {
        const userId = ws.data.user.id;
        
        // Limpiar suscripciones a threads
        const threads = this.userThreads.get(userId);
        if (threads) {
            console.log(`🧹 [Cleanup] Removing user ${userId} from ${threads.size} threads`);
            threads.forEach(threadId => {
                this.unsubscribeFromThread(userId, threadId);
            });
        }
        
        this.userThreads.delete(userId);
        this.connectionManager.removeConnection(userId);
        
        console.log(`🔌 [WebSocket] User ${userId} disconnected (Remaining: ${this.connectionManager.getConnectedUsers().length} users)`);
    }

    async handleMessage(ws: ServerWebSocket<{ user: User }>, message: string | Buffer) {
        try {
            const parsedMessage = JSON.parse(message.toString()) as ClientMessage;

            switch (parsedMessage.type) {
                case "JOIN_THREAD":
                    await this.handleJoinThread(ws.data.user.id, parsedMessage.payload.threadId);
                    break;
                case "LEAVE_THREAD":
                    await this.handleLeaveThread(ws.data.user.id, parsedMessage.payload.threadId);
                    break;
                case "SEND_MESSAGE":
                    await this.handleSendMessage(ws.data.user, parsedMessage.payload);
                    break;
                default:
                    console.warn("Unknown message type:", (parsedMessage as any).type);
            }
        } catch (error) {
            console.error("Error handling message:", error);
            ws.send(JSON.stringify({
                type: "ERROR",
                payload: { message: "Invalid message format" }
            }));
        }
    }

    /**
     * Suscribir usuario a un thread
     * A partir de aquí, recibirá eventos de NEW_MESSAGE para este thread
     */
    private async handleJoinThread(userId: string, threadId: string) {
        console.log(`🔵 [JOIN_THREAD] User ${userId} requesting to join thread ${threadId}`);
        
        try {
            // Verificar que el thread existe y el usuario tiene acceso
            const thread = await this.threadService.getThreadById(threadId, userId);
            this.subscribeToThread(userId, threadId);
        } catch (error: any) {
            console.error(`❌ [JOIN_THREAD] Error:`, error.message);
            const ws = this.connectionManager.getConnection(userId);
            if (ws) {
                ws.send(JSON.stringify({
                    type: "ERROR",
                    payload: { message: error.message || "Cannot join thread" }
                }));
            }
        }
    }

    /**
     * Des-suscribir usuario de un thread
     */
    private async handleLeaveThread(userId: string, threadId: string) {
        console.log(`🔴 [LEAVE_THREAD] User ${userId} requesting to leave thread ${threadId}`);
        this.unsubscribeFromThread(userId, threadId);
    }

    /**
     * Maneja mensajes enviados por el cliente vía WebSocket
     * (Nota: El flujo recomendado es POST /api/messages, no por WebSocket)
     */
    private async handleSendMessage(user: User, payload: any) {
        const validation = createMessageDto.safeParse({ ...payload, senderId: user.id });

        if (!validation.success) {
            console.error("Validation error:", validation.error);
            return;
        }

        const data = validation.data;

        try {
            // El servicio emitirá el evento automáticamente
            await this.messageService.createMessage(data);
        } catch (error) {
            console.error("Error creating message:", error);
        }
    }

    /**
     * Suscribir un usuario a los eventos de un thread
     * Solo crea UNA suscripción al EventEmitter por thread (compartida por todos los usuarios)
     */
    private subscribeToThread(userId: string, threadId: string) {
        const threads = this.userThreads.get(userId);
        if (!threads) return;

        // Si el usuario ya está suscrito a este thread, no hacer nada
        if (threads.has(threadId)) {
            console.log(`⚠️ [Thread] User ${userId} already subscribed to thread ${threadId}`);
            return;
        }

        threads.add(threadId);
        console.log(`✅ [Thread] User ${userId} subscribed to thread ${threadId}`);

        // Si ya existe una suscripción para este thread, no crear otra
        if (this.threadSubscriptions.has(threadId)) {
            console.log(`ℹ️ [Thread] Thread ${threadId} already has an active subscription`);
            return;
        }

        // Crear UNA ÚNICA suscripción al EventEmitter para este thread
        const createdCallback = (event: MessageCreatedEvent) => {
            this.broadcastMessageToThread(threadId, event);
        };
        
        const deletedCallback = (event: MessageDeletedEvent) => {
            this.broadcastMessageDeletedToThread(threadId, event);
        };

        this.threadSubscriptions.set(threadId, createdCallback);
        this.threadDeleteSubscriptions.set(threadId, deletedCallback);
        this.eventEmitter.subscribeToThread(threadId, createdCallback);
        this.eventEmitter.subscribeToThreadDeletes(threadId, deletedCallback);
        
        console.log(`🔔 [EventEmitter] Subscribed to thread ${threadId} events`);
    }

    /**
     * Des-suscribirse de los eventos de un thread
     * Solo elimina la suscripción del EventEmitter cuando NO quedan usuarios en el thread
     */
    private unsubscribeFromThread(userId: string, threadId: string) {
        const threads = this.userThreads.get(userId);
        if (!threads) return;

        if (!threads.has(threadId)) return;

        threads.delete(threadId);
        console.log(`🔌 [Thread] User ${userId} unsubscribed from thread ${threadId}`);

        // Verificar si todavía hay otros usuarios suscritos a este thread
        const hasOtherSubscribers = Array.from(this.userThreads.values())
            .some(userThreadSet => userThreadSet.has(threadId));

        // Si NO hay más usuarios suscritos, eliminar la suscripción del EventEmitter
        if (!hasOtherSubscribers) {
            const createdCallback = this.threadSubscriptions.get(threadId);
            const deletedCallback = this.threadDeleteSubscriptions.get(threadId);
            
            if (createdCallback) {
                this.eventEmitter.unsubscribeFromThread(threadId, createdCallback);
                this.threadSubscriptions.delete(threadId);
            }
            
            if (deletedCallback) {
                this.eventEmitter.unsubscribeFromThreadDeletes(threadId, deletedCallback);
                this.threadDeleteSubscriptions.delete(threadId);
            }
            
            console.log(`🔕 [EventEmitter] Unsubscribed from thread ${threadId} events (no more users)`);
        } else {
            console.log(`ℹ️ [Thread] Thread ${threadId} still has other subscribed users`);
        }
    }

    /**
     * Broadcast de un mensaje a todos los usuarios del thread
     * Este es el ÚNICO lugar donde se envían NEW_MESSAGE eventos al cliente
     * Se llama UNA SOLA VEZ por mensaje (gracias a la suscripción única por thread)
     */
    private async broadcastMessageToThread(threadId: string, messageEvent: MessageCreatedEvent) {
        try {
            console.log(`📢 [Broadcast] Starting broadcast for message ${messageEvent.id} in thread ${threadId}`);
            
            // Obtener el thread para saber a qué canal pertenece
            const thread = await this.threadService.getThreadById(threadId, "system"); // system bypass permission check
            if (!thread) {
                console.error(`❌ [Broadcast] Thread ${threadId} not found`);
                return;
            }

            // Construir el payload con información del usuario
            const response: ServerNewMessageEvent = {
                type: "NEW_MESSAGE",
                payload: {
                    id: messageEvent.id,
                    content: messageEvent.content,
                    attachments: messageEvent.attachments,
                    senderId: messageEvent.senderId,
                    threadId: messageEvent.threadId,
                    createdAt: messageEvent.createdAt.toISOString(),
                    sender: messageEvent.sender
                }
            };

            const responseString = JSON.stringify(response);
            let sentCount = 0;

            // Enviar a TODOS los usuarios suscritos a este thread que están conectados
            this.userThreads.forEach((threads, userId) => {
                if (threads.has(threadId)) {
                    const ws = this.connectionManager.getConnection(userId);
                    if (ws && ws.readyState === 1) { // 1 = Open
                        ws.send(responseString);
                        sentCount++;
                        console.log(`📤 [Broadcast] Message ${messageEvent.id} sent to user ${userId}`);
                    }
                }
            });
            
            console.log(`✅ [Broadcast] Completed: message ${messageEvent.id} sent to ${sentCount} users in thread ${threadId}`);
        } catch (error) {
            console.error(`❌ [Broadcast] Error broadcasting message to thread ${threadId}:`, error);
        }
    }

    /**
     * Broadcast de eliminación de mensaje a todos los usuarios del thread
     */
    private async broadcastMessageDeletedToThread(threadId: string, messageEvent: MessageDeletedEvent) {
        try {
            console.log(`📢 [Broadcast] Starting broadcast for deleted message ${messageEvent.id} in thread ${threadId}`);
            
            const response: ServerMessageDeletedEvent = {
                type: "MESSAGE_DELETED",
                payload: {
                    id: messageEvent.id,
                    threadId: messageEvent.threadId,
                }
            };

            const responseString = JSON.stringify(response);
            let sentCount = 0;

            // Enviar a TODOS los usuarios suscritos a este thread
            this.userThreads.forEach((threads, userId) => {
                if (threads.has(threadId)) {
                    const ws = this.connectionManager.getConnection(userId);
                    if (ws && ws.readyState === 1) {
                        ws.send(responseString);
                        sentCount++;
                    }
                }
            });
            
            console.log(`✅ [Broadcast] Completed: deleted message ${messageEvent.id} broadcasted to ${sentCount} users`);
        } catch (error) {
            console.error(`❌ [Broadcast] Error broadcasting delete to thread ${threadId}:`, error);
        }
    }

    /**
     * Método de depuración para monitorear el estado interno del gateway
     */
    getDebugInfo() {
        const threadStats = Array.from(this.threadSubscriptions.keys()).map(threadId => {
            const subscribedUsers = Array.from(this.userThreads.entries())
                .filter(([_, threads]) => threads.has(threadId))
                .map(([userId, _]) => userId);
            
            return {
                threadId,
                subscribedUsers,
                userCount: subscribedUsers.length,
                hasEventSubscription: this.threadSubscriptions.has(threadId)
            };
        });

        return {
            totalConnectedUsers: this.connectionManager.getConnectedUsers().length,
            totalThreadSubscriptions: this.threadSubscriptions.size,
            threads: threadStats,
            userThreads: Array.from(this.userThreads.entries()).map(([userId, threads]) => ({
                userId,
                threads: Array.from(threads)
            }))
        };
    }
}
