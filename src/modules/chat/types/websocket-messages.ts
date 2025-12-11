/**
 * WebSocket Message Types
 * 
 * Define los tipos de mensajes que se intercambian entre cliente y servidor
 * Sigue el patrón: { type: string, payload: unknown }
 */

// ============================================================================
// CLIENT -> SERVER (El cliente envía estos eventos)
// ============================================================================

export interface JoinChannelMessage {
    type: "JOIN_CHANNEL";
    payload: {
        channelId: string;
    };
}

export interface LeaveChannelMessage {
    type: "LEAVE_CHANNEL";
    payload: {
        channelId: string;
    };
}

export interface SendMessageMessage {
    type: "SEND_MESSAGE";
    payload: {
        channelId: string;
        content: string;
        // idempotencyKey?: string; // Opcional: para deduplicación en el cliente
    };
}

export type ClientMessage =
    | JoinChannelMessage
    | LeaveChannelMessage
    | SendMessageMessage;

// ============================================================================
// SERVER -> CLIENT (El servidor envía estos eventos)
// ============================================================================

export interface UserData {
    id: string;
    name: string;
    image?: string | null;
}

/**
 * Evento: Nuevo mensaje creado
 * 
 * El servidor emite este evento cuando:
 * 1. Un mensaje fue guardado en la BD
 * 2. Es emitido a TODOS los miembros del canal (incluyendo el que lo envió)
 * 
 * Este es el ÚNICO lugar donde el cliente debe actualizar su lista de mensajes.
 * El cliente reemplaza mensajes temporales con este mensaje real.
 */
export interface ServerNewMessageEvent {
    type: "NEW_MESSAGE";
    payload: {
        id: string;
        content: string;
        senderId: string;
        channelId: string;
        createdAt: string; // ISO 8601
        sender: UserData; // Información del usuario que envió
    };
}

/**
 * Evento: Error
 * Se emite cuando hay un error en el procesamiento de un mensaje del cliente
 */
export interface ServerErrorEvent {
    type: "ERROR";
    payload: {
        message: string;
        code?: string;
    };
}

export type ServerMessage =
    | ServerNewMessageEvent
    | ServerErrorEvent;

// ============================================================================
// Type Guards (helpers para type checking)
// ============================================================================

export function isClientMessage(data: any): data is ClientMessage {
    return data && typeof data.type === "string" && data.payload !== undefined;
}

export function isServerNewMessageEvent(data: any): data is ServerNewMessageEvent {
    return data?.type === "NEW_MESSAGE";
}

export function isServerErrorEvent(data: any): data is ServerErrorEvent {
    return data?.type === "ERROR";
}
