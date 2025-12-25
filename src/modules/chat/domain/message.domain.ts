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
}
