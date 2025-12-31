/**
 * Domain entities and interfaces for Message
 */

/**
 * Representa un archivo adjunto en un mensaje
 */
export interface MessageAttachment {
    /** Identificador único del attachment */
    id: string;
    /** URL pública del archivo */
    url: string;
    /** Nombre original del archivo */
    filename: string;
    /** Tipo MIME del archivo */
    mimeType: string;
    /** Tamaño en bytes */
    size: number;
    /** Categoría para renderizado en frontend */
    type: 'image' | 'document' | 'video' | 'audio';
}

export interface Message {
    id: string;
    senderId: string;
    threadId: string;
    content: string;
    /** Archivos adjuntos del mensaje */
    attachments: MessageAttachment[] | null;
    createdAt: Date;
}

export interface MessageWithSender extends Message {
    sender: {
        id: string;
        name: string;
        profile: {
            displayName: string;
            avatarUrl: string | null;
        }
    }
}

export interface CreateMessageData {
    threadId: string;
    senderId: string;
    content: string;
    /** Archivos adjuntos opcionales */
    attachments?: MessageAttachment[];
}
