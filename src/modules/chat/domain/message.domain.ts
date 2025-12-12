/**
 * Domain entities and interfaces for Message
 */

export interface Message {
    id: string;
    senderId: string;
    threadId: string;
    content: string;
    createdAt: Date;
}

export interface CreateMessageData {
    threadId: string;
    senderId: string;
    content: string;
}
