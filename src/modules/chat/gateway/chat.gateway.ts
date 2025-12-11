import { ServerWebSocket } from "bun";
import { ConnectionManager } from "./connection.manager";
import { MessageService } from "../services/message.service";
import { ChannelMemberService } from "../services/channel-member.service";
import { MessageEventEmitter, MessageCreatedEvent } from "../services/message-event.emitter";
import { createMessageDto } from "../dtos/create-message.dto";
import { ServerNewMessageEvent, ClientMessage } from "../types/websocket-messages";
import { users } from "../../../db/schema/users.entity";

type User = typeof users.$inferSelect;

/**
 * ChatGateway
 * 
 * Implementa Server-Driven State Synchronization:
 * 1. El servidor es la ÚNICA FUENTE DE VERDAD
 * 2. Los clientes reciben confirmación por WebSocket
 * 3. El cliente actualiza su estado basado en los eventos del servidor
 * 
 * Flujo:
 * 1. Cliente: POST /api/messages (con tempId en UI)
 * 2. Servidor: Guarda en BD
 * 3. Servidor: Emite evento MESSAGE_CREATED por EventEmitter
 * 4. Gateway: Broadcast a todos los usuarios del canal
 * 5. Cliente: Recibe por WebSocket y reemplaza temp con real
 */
export class ChatGateway {
    // Mapeo: userId -> conjunto de channelIds a los que está suscrito
    private userChannels: Map<string, Set<string>> = new Map();
    
    // Mapeo: channelId -> callback del EventEmitter
    // UNA ÚNICA suscripción por canal (no por usuario)
    private channelSubscriptions: Map<string, (event: MessageCreatedEvent) => void> = new Map();

    constructor(
        private readonly connectionManager: ConnectionManager,
        private readonly messageService: MessageService,
        private readonly channelMemberService: ChannelMemberService,
        private readonly eventEmitter: MessageEventEmitter
    ) { }

    handleConnection(ws: ServerWebSocket<{ user: User }>) {
        const userId = ws.data.user.id;
        this.connectionManager.addConnection(userId, ws);
        
        // Inicializar el Set de canales para este usuario si no existe
        if (!this.userChannels.has(userId)) {
            this.userChannels.set(userId, new Set());
        }
        
        console.log(`✅ [WebSocket] User ${userId} connected (Total: ${this.connectionManager.getConnectedUsers().length} users)`);
    }

    handleDisconnect(ws: ServerWebSocket<{ user: User }>) {
        const userId = ws.data.user.id;
        
        // Limpiar suscripciones
        const channels = this.userChannels.get(userId);
        if (channels) {
            console.log(`🧹 [Cleanup] Removing user ${userId} from ${channels.size} channels`);
            channels.forEach(channelId => {
                this.unsubscribeFromChannel(userId, channelId);
            });
        }
        
        this.userChannels.delete(userId);
        this.connectionManager.removeConnection(userId);
        
        console.log(`🔌 [WebSocket] User ${userId} disconnected (Remaining: ${this.connectionManager.getConnectedUsers().length} users)`);
    }

    async handleMessage(ws: ServerWebSocket<{ user: User }>, message: string | Buffer) {
        try {
            const parsedMessage = JSON.parse(message.toString()) as ClientMessage;

            switch (parsedMessage.type) {
                case "JOIN_CHANNEL":
                    await this.handleJoinChannel(ws.data.user.id, parsedMessage.payload.channelId);
                    break;
                case "LEAVE_CHANNEL":
                    await this.handleLeaveChannel(ws.data.user.id, parsedMessage.payload.channelId);
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
     * Suscribir usuario a un canal
     * A partir de aquí, recibirá eventos de NEW_MESSAGE para este canal
     */
    private async handleJoinChannel(userId: string, channelId: string) {
        console.log(`🔵 [JOIN_CHANNEL] User ${userId} requesting to join channel ${channelId}`);
        this.subscribeToChannel(userId, channelId);
    }

    /**
     * Des-suscribir usuario de un canal
     */
    private async handleLeaveChannel(userId: string, channelId: string) {
        console.log(`🔴 [LEAVE_CHANNEL] User ${userId} requesting to leave channel ${channelId}`);
        this.unsubscribeFromChannel(userId, channelId);
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
     * Suscribir un usuario a los eventos de un canal
     * Solo crea UNA suscripción al EventEmitter por canal (compartida por todos los usuarios)
     */
    private subscribeToChannel(userId: string, channelId: string) {
        const channels = this.userChannels.get(userId);
        if (!channels) return;

        // Si el usuario ya está suscrito a este canal, no hacer nada
        if (channels.has(channelId)) {
            console.log(`⚠️ [Channel] User ${userId} already subscribed to channel ${channelId}`);
            return;
        }

        channels.add(channelId);
        console.log(`✅ [Channel] User ${userId} subscribed to channel ${channelId}`);

        // Si ya existe una suscripción para este canal, no crear otra
        if (this.channelSubscriptions.has(channelId)) {
            console.log(`ℹ️ [Channel] Channel ${channelId} already has an active subscription`);
            return;
        }

        // Crear UNA ÚNICA suscripción al EventEmitter para este canal
        const callback = (event: MessageCreatedEvent) => {
            this.broadcastMessageToChannel(channelId, event);
        };

        this.channelSubscriptions.set(channelId, callback);
        this.eventEmitter.subscribeToChannel(channelId, callback);
        
        console.log(`🔔 [EventEmitter] Subscribed to channel ${channelId} events`);
    }

    /**
     * Des-suscribirse de los eventos de un canal
     * Solo elimina la suscripción del EventEmitter cuando NO quedan usuarios en el canal
     */
    private unsubscribeFromChannel(userId: string, channelId: string) {
        const channels = this.userChannels.get(userId);
        if (!channels) return;

        if (!channels.has(channelId)) return;

        channels.delete(channelId);
        console.log(`🔌 [Channel] User ${userId} unsubscribed from channel ${channelId}`);

        // Verificar si todavía hay otros usuarios suscritos a este canal
        const hasOtherSubscribers = Array.from(this.userChannels.values())
            .some(userChannelSet => userChannelSet.has(channelId));

        // Si NO hay más usuarios suscritos, eliminar la suscripción del EventEmitter
        if (!hasOtherSubscribers) {
            const callback = this.channelSubscriptions.get(channelId);
            if (callback) {
                this.eventEmitter.unsubscribeFromChannel(channelId, callback);
                this.channelSubscriptions.delete(channelId);
                console.log(`🔕 [EventEmitter] Unsubscribed from channel ${channelId} events (no more users)`);
            }
        } else {
            console.log(`ℹ️ [Channel] Channel ${channelId} still has other subscribed users`);
        }
    }

    /**
     * Broadcast de un mensaje a todos los usuarios del canal
     * Este es el ÚNICO lugar donde se envían NEW_MESSAGE eventos al cliente
     * Se llama UNA SOLA VEZ por mensaje (gracias a la suscripción única por canal)
     */
    private async broadcastMessageToChannel(channelId: string, messageEvent: MessageCreatedEvent) {
        try {
            console.log(`📢 [Broadcast] Starting broadcast for message ${messageEvent.id} in channel ${channelId}`);
            
            // Obtener información del sender
            const members = await this.channelMemberService.getMembersByChannelId(channelId);

            // Construir el payload con información del usuario
            const response: ServerNewMessageEvent = {
                type: "NEW_MESSAGE",
                payload: {
                    id: messageEvent.id,
                    content: messageEvent.content,
                    senderId: messageEvent.senderId,
                    channelId: messageEvent.channelId,
                    createdAt: messageEvent.createdAt.toISOString(),
                    // Nota: En producción, obtener datos reales del usuario
                    sender: {
                        id: messageEvent.senderId,
                        name: "User", // TODO: obtener del servicio de usuarios
                        image: null
                    }
                }
            };

            const responseString = JSON.stringify(response);
            let sentCount = 0;

            // Enviar a TODOS los miembros del canal que están conectados
            members.forEach(member => {
                const memberWs = this.connectionManager.getConnection(member.member.userId);
                if (memberWs && memberWs.readyState === 1) { // 1 = Open
                    memberWs.send(responseString);
                    sentCount++;
                    console.log(`📤 [Broadcast] Message ${messageEvent.id} sent to user ${member.member.userId}`);
                }
            });
            
            console.log(`✅ [Broadcast] Completed: message ${messageEvent.id} sent to ${sentCount} users in channel ${channelId}`);
        } catch (error) {
            console.error(`❌ [Broadcast] Error broadcasting message to channel ${channelId}:`, error);
        }
    }

    /**
     * Método de depuración para monitorear el estado interno del gateway
     */
    getDebugInfo() {
        const channelStats = Array.from(this.channelSubscriptions.keys()).map(channelId => {
            const subscribedUsers = Array.from(this.userChannels.entries())
                .filter(([_, channels]) => channels.has(channelId))
                .map(([userId, _]) => userId);
            
            return {
                channelId,
                subscribedUsers,
                userCount: subscribedUsers.length,
                hasEventSubscription: this.channelSubscriptions.has(channelId)
            };
        });

        return {
            totalConnectedUsers: this.connectionManager.getConnectedUsers().length,
            totalChannelSubscriptions: this.channelSubscriptions.size,
            channels: channelStats,
            userChannels: Array.from(this.userChannels.entries()).map(([userId, channels]) => ({
                userId,
                channels: Array.from(channels)
            }))
        };
    }
}
