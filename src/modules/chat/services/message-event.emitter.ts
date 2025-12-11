import { EventEmitter } from "events";
import { MessageRow } from "../repositories/message.repository";

export interface MessageCreatedEvent {
    id: string;
    content: string;
    senderId: string;
    channelId: string;
    createdAt: Date;
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
    private readonly CHANNEL_PREFIX = "channel:";

    /**
     * Emite cuando se crea un mensaje en un canal
     * El cliente recibe esto por WebSocket y actualiza su estado
     */
    emitMessageCreated(message: MessageRow): void {
        const event = `${this.CHANNEL_PREFIX}${message.channelId}:message:created`;
        
        const payload: MessageCreatedEvent = {
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            channelId: message.channelId,
            createdAt: message.createdAt,
        };

        console.log(`📤 [Event] Message created in channel ${message.channelId}: ${message.id}`);
        this.emit(event, payload);
    }

    /**
     * Suscribirse a mensajes de un canal específico
     */
    subscribeToChannel(
        channelId: string,
        callback: (message: MessageCreatedEvent) => void
    ): void {
        const event = `${this.CHANNEL_PREFIX}${channelId}:message:created`;
        this.on(event, callback);
    }

    /**
     * Des-suscribirse de un canal
     */
    unsubscribeFromChannel(
        channelId: string,
        callback: (message: MessageCreatedEvent) => void
    ): void {
        const event = `${this.CHANNEL_PREFIX}${channelId}:message:created`;
        this.off(event, callback);
    }

    /**
     * Obtener el nombre del evento para un canal
     */
    getChannelEvent(channelId: string): string {
        return `${this.CHANNEL_PREFIX}${channelId}:message:created`;
    }
}
