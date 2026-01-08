import type { Message, CreateMessageData, MessageWithSender } from '../entities';

export interface IMessageRepository {
    create(data: CreateMessageData): Promise<Message>;
    findByThread(threadId: string, limit?: number, offset?: number): Promise<MessageWithSender[]>;
    findById(id: string): Promise<Message | undefined>;
    findByIdWithSender(id: string): Promise<MessageWithSender | undefined>;
    delete(id: string): Promise<Message | undefined>;
    countByThread(threadId: string): Promise<number>;
}