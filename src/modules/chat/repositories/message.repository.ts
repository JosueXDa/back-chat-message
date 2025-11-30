import { db } from "../../../db/index";
import { messages } from "../../../db/schema/messages.entity";
import { eq, desc } from "drizzle-orm";
import { CreateMessageDto } from "../dtos/create-message.dto";

export type MessageRow = typeof messages.$inferSelect;

export class MessageRepository {
    async create(data: CreateMessageDto): Promise<MessageRow> {
        try {
            const [newMessage] = await db.insert(messages).values({
                channelId: data.channelId,
                senderId: data.senderId,
                content: data.content,
            }).returning();

            return newMessage;
        } catch (error) {
            console.error("Error creating message:", error);
            throw error;
        }
    }

    async findByChannel(channelId: string, limit: number = 50): Promise<MessageRow[]> {
        try {
            return await db.select()
                .from(messages)
                .where(eq(messages.channelId, channelId))
                .orderBy(desc(messages.createdAt))
                .limit(limit);
        } catch (error) {
            console.error(`Error finding messages for channel ${channelId}:`, error);
            throw error;
        }
    }
}
