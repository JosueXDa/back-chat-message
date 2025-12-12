import { db } from "../../../db/index";
import { messages } from "../../../db/schema/messages.entity";
import { eq } from "drizzle-orm";
import type { Message, CreateMessageData } from "../domain";

export class MessageRepository {
    async create(data: CreateMessageData): Promise<Message> {
        try {
            const [newMessage] = await db.insert(messages).values({
                threadId: data.threadId,
                senderId: data.senderId,
                content: data.content,
            }).returning();

            return newMessage;
        } catch (error) {
            console.error("Error creating message:", error);
            throw error;
        }
    }

    async findByThread(threadId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
        try {
            return await db.select()
                .from(messages)
                .where(eq(messages.threadId, threadId))
                .orderBy(messages.createdAt)
                .limit(limit)
                .offset(offset);
        } catch (error) {
            console.error(`Error finding messages for thread ${threadId}:`, error);
            throw error;
        }
    }

    async findById(id: string): Promise<Message | undefined> {
        try {
            const [message] = await db
                .select()
                .from(messages)
                .where(eq(messages.id, id));

            return message;
        } catch (error) {
            console.error(`Error finding message with id ${id}:`, error);
            throw error;
        }
    }

    async delete(id: string): Promise<Message | undefined> {
        try {
            const [deletedMessage] = await db
                .delete(messages)
                .where(eq(messages.id, id))
                .returning();

            return deletedMessage;
        } catch (error) {
            console.error(`Error deleting message with id ${id}:`, error);
            throw error;
        }
    }

    async countByThread(threadId: string): Promise<number> {
        try {
            const result = await db
                .select()
                .from(messages)
                .where(eq(messages.threadId, threadId));

            return result.length;
        } catch (error) {
            console.error(`Error counting messages for thread ${threadId}:`, error);
            throw error;
        }
    }
}
