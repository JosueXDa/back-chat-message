import { MessageAttachment } from "../domain/message.domain";

/**
 * WebSocket Message Types
 * 
 * Define los tipos de mensajes que se intercambian entre cliente y servidor
 * Sigue el patrón: { type: string, payload: unknown }
 * 
 * ARQUITECTURA CON THREADS:
 * - Los usuarios se unen a THREADS (no directamente a canales)
 * - Los mensajes pertenecen a THREADS
 * - Un canal puede tener múltiples threads
 */

// ============================================================================
// CLIENT -> SERVER (El cliente envía estos eventos)
// ============================================================================

export interface JoinThreadMessage {
    type: "JOIN_THREAD";
    payload: {
        threadId: string;
    };
}

export interface LeaveThreadMessage {
    type: "LEAVE_THREAD";
    payload: {
        threadId: string;
    };
}

export interface SendMessageMessage {
    type: "SEND_MESSAGE";
    payload: {
        threadId: string;
        content: string;
        // idempotencyKey?: string; // Opcional: para deduplicación en el cliente
    };
}

export type ClientMessage =
    | JoinThreadMessage
    | LeaveThreadMessage
    | SendMessageMessage;

// ============================================================================
// SERVER -> CLIENT (El servidor envía estos eventos)
// ============================================================================

export interface UserData {
    id: string;
    name: string;
    profile: {
        displayName: string;
        avatarUrl: string | null;
    }
}

/**
 * Evento: Nuevo mensaje creado
 * 
 * El servidor emite este evento cuando:
 * 1. Un mensaje fue guardado en la BD en un thread específico
 * 2. Es emitido a TODOS los miembros del thread (incluyendo el que lo envió)
 * 
 * Este es el ÚNICO lugar donde el cliente debe actualizar su lista de mensajes.
 * El cliente reemplaza mensajes temporales con este mensaje real.
 */
export interface ServerNewMessageEvent {
    type: "NEW_MESSAGE";
    payload: {
        id: string;
        content: string;
        attachments: MessageAttachment[] | null;
        senderId: string;
        threadId: string;
        createdAt: string; // ISO 8601
        sender: UserData; // Información del usuario que envió
    };
}

/**
 * Evento: Mensaje eliminado
 * Se emite cuando un mensaje es eliminado de un thread
 */
export interface ServerMessageDeletedEvent {
    type: "MESSAGE_DELETED";
    payload: {
        id: string;
        threadId: string;
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
    | ServerMessageDeletedEvent
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
