import { EventEmitter } from "events";
import { Message } from "../domain/message.domain";

export interface MessageCreatedEvent {
    id: string;
    content: string;
    senderId: string;
    threadId: string;
    createdAt: Date;
}

export interface MessageDeletedEvent {
    id: string;
    threadId: string;
}

/**
 * MessageEventEmitter
 * 
 * Actúa como el servidor siendo la ÚNICA FUENTE DE VERDAD
 * para cambios en mensajes. El cliente escucha estos eventos
 * a través de WebSocket y actualiza su estado basado en ellos.
 * 
 * Flujo:
 * 1. Cliente envía POST /api/messages
 * 2. Servidor guarda en BD y emite MESSAGE_CREATED
 * 3. WebSocket broadcast envia a todos los usuarios
 * 4. Cliente recibe por WebSocket y actualiza UI
 */
export class MessageEventEmitter extends EventEmitter {
    private readonly THREAD_PREFIX = "thread:";

    /**
     * Emite cuando se crea un mensaje en un thread
     * El cliente recibe esto por WebSocket y actualiza su estado
     */
    emitMessageCreated(message: Message): void {
        const event = `${this.THREAD_PREFIX}${message.threadId}:message:created`;
        
        const payload: MessageCreatedEvent = {
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            threadId: message.threadId,
            createdAt: message.createdAt,
        };

        console.log(`📤 [Event] Message created in thread ${message.threadId}: ${message.id}`);
        this.emit(event, payload);
    }

    /**
     * Emite cuando se elimina un mensaje
     */
    emitMessageDeleted(messageId: string, threadId: string): void {
        const event = `${this.THREAD_PREFIX}${threadId}:message:deleted`;
        
        const payload: MessageDeletedEvent = {
            id: messageId,
            threadId,
        };

        console.log(`📤 [Event] Message deleted in thread ${threadId}: ${messageId}`);
        this.emit(event, payload);
    }

    /**
     * Suscribirse a mensajes de un thread específico
     */
    subscribeToThread(
        threadId: string,
        callback: (message: MessageCreatedEvent) => void
    ): void {
        const event = `${this.THREAD_PREFIX}${threadId}:message:created`;
        this.on(event, callback);
    }

    /**
     * Suscribirse a eliminaciones de mensajes en un thread
     */
    subscribeToThreadDeletes(
        threadId: string,
        callback: (data: MessageDeletedEvent) => void
    ): void {
        const event = `${this.THREAD_PREFIX}${threadId}:message:deleted`;
        this.on(event, callback);
    }

    /**
     * Des-suscribirse de un thread
     */
    unsubscribeFromThread(
        threadId: string,
        callback: (message: MessageCreatedEvent) => void
    ): void {
        const event = `${this.THREAD_PREFIX}${threadId}:message:created`;
        this.off(event, callback);
    }

    /**
     * Des-suscribirse de eliminaciones
     */
    unsubscribeFromThreadDeletes(
        threadId: string,
        callback: (data: MessageDeletedEvent) => void
    ): void {
        const event = `${this.THREAD_PREFIX}${threadId}:message:deleted`;
        this.off(event, callback);
    }

    /**
     * Obtener el nombre del evento para un thread
     */
    getThreadEvent(threadId: string): string {
        return `${this.THREAD_PREFIX}${threadId}:message:created`;
    }

    /**
     * Obtener el nombre del evento de eliminación para un thread
     */
    getThreadDeleteEvent(threadId: string): string {
        return `${this.THREAD_PREFIX}${threadId}:message:deleted`;
    }
}
