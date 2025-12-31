import { db } from "../../../db/index";
import { messages } from "../../../db/schema/messages.entity";
import { users } from "../../../db/schema/users.entity";
import { profile } from "../../../db/schema/profile.entity";
import { eq, desc } from "drizzle-orm";
import type { Message, CreateMessageData, MessageWithSender } from "../domain";

export class MessageRepository {
    async create(data: CreateMessageData): Promise<Message> {
        try {
            const [newMessage] = await db.insert(messages).values({
                threadId: data.threadId,
                senderId: data.senderId,
                content: data.content,
                attachments: data.attachments ?? [],
            }).returning();

            return newMessage;
        } catch (error) {
            console.error("Error creating message:", error);
            throw error;
        }
    }

    async findByThread(threadId: string, limit: number = 50, offset: number = 0): Promise<MessageWithSender[]> {
        try {
            const result = await db.select({
                id: messages.id,
                content: messages.content,
                attachments: messages.attachments,
                createdAt: messages.createdAt,
                senderId: messages.senderId,
                threadId: messages.threadId,
                senderName: users.name,
                senderDisplayName: profile.displayName,
                senderAvatarUrl: profile.avatarUrl
            })
                .from(messages)
                .innerJoin(users, eq(messages.senderId, users.id))
                .leftJoin(profile, eq(users.id, profile.userId))
                .where(eq(messages.threadId, threadId))
                .orderBy(desc(messages.createdAt))
                .limit(limit)
                .offset(offset);

            return result.map(row => ({
                id: row.id,
                content: row.content,
                attachments: row.attachments,
                createdAt: row.createdAt,
                senderId: row.senderId,
                threadId: row.threadId,
                sender: {
                    id: row.senderId,
                    name: row.senderName,
                    profile: {
                        displayName: row.senderDisplayName || row.senderName,
                        avatarUrl: row.senderAvatarUrl
                    }
                }
            })).reverse();
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

    async findByIdWithSender(id: string): Promise<MessageWithSender | undefined> {
        try {
            const [row] = await db.select({
                id: messages.id,
                content: messages.content,
                attachments: messages.attachments,
                createdAt: messages.createdAt,
                senderId: messages.senderId,
                threadId: messages.threadId,
                senderName: users.name,
                senderDisplayName: profile.displayName,
                senderAvatarUrl: profile.avatarUrl
            })
                .from(messages)
                .innerJoin(users, eq(messages.senderId, users.id))
                .leftJoin(profile, eq(users.id, profile.userId))
                .where(eq(messages.id, id));

            if (!row) return undefined;

            return {
                id: row.id,
                content: row.content,
                attachments: row.attachments,
                createdAt: row.createdAt,
                senderId: row.senderId,
                threadId: row.threadId,
                sender: {
                    id: row.senderId,
                    name: row.senderName,
                    profile: {
                        displayName: row.senderDisplayName || row.senderName,
                        avatarUrl: row.senderAvatarUrl
                    }
                }
            };
        } catch (error) {
            console.error(`Error finding message with sender for id ${id}:`, error);
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
