import { db } from "@/db/index";
import { threads } from "@/db/schema/threads.entity";
import { eq, desc, and } from "drizzle-orm";
import type { Thread, CreateThreadData, UpdateThreadData } from "../../entities/thread.entity";
import { IThreadRepository } from "../thread.repository";

export class ThreadRepositoryImpl implements IThreadRepository {
    async create(data: CreateThreadData): Promise<Thread> {
        try {
            const [newThread] = await db.insert(threads).values({
                channelId: data.channelId,
                name: data.name,
                description: data.description,
                createdBy: data.createdBy,
            }).returning();

            return newThread;
        } catch (error) {
            console.error("Error creating thread:", error);
            throw error;
        }
    }

    async update(id: string, data: UpdateThreadData): Promise<Thread | undefined> {
        try {
            const updateData: Partial<typeof threads.$inferInsert> = {};

            if (data.name !== undefined) updateData.name = data.name;
            if (data.description !== undefined) updateData.description = data.description;
            if (data.isArchived !== undefined) updateData.isArchived = data.isArchived;

            if (Object.keys(updateData).length === 0) {
                return this.findById(id);
            }

            updateData.updatedAt = new Date();

            const [updatedThread] = await db
                .update(threads)
                .set(updateData)
                .where(eq(threads.id, id))
                .returning();

            return updatedThread;
        } catch (error) {
            console.error(`Error updating thread with id ${id}:`, error);
            throw error;
        }
    }

    async delete(id: string): Promise<Thread | undefined> {
        try {
            const [deletedThread] = await db
                .delete(threads)
                .where(eq(threads.id, id))
                .returning();

            return deletedThread;
        } catch (error) {
            console.error(`Error deleting thread with id ${id}:`, error);
            throw error;
        }
    }

    async findById(id: string): Promise<Thread | undefined> {
        try {
            const [thread] = await db
                .select()
                .from(threads)
                .where(eq(threads.id, id));

            return thread;
        } catch (error) {
            console.error(`Error finding thread with id ${id}:`, error);
            throw error;
        }
    }

    async findByChannel(channelId: string): Promise<Thread[]> {
        try {
            return await db
                .select()
                .from(threads)
                .where(eq(threads.channelId, channelId))
                .orderBy(desc(threads.createdAt));
        } catch (error) {
            console.error(`Error finding threads for channel ${channelId}:`, error);
            throw error;
        }
    }

    async findActiveByChannel(channelId: string): Promise<Thread[]> {
        try {
            return await db
                .select()
                .from(threads)
                .where(
                    and(
                        eq(threads.channelId, channelId),
                        eq(threads.isArchived, false)
                    )
                )
                .orderBy(desc(threads.updatedAt));
        } catch (error) {
            console.error(`Error finding active threads for channel ${channelId}:`, error);
            throw error;
        }
    }

    async archive(id: string): Promise<Thread | undefined> {
        try {
            return await this.update(id, { isArchived: true });
        } catch (error) {
            console.error(`Error archiving thread with id ${id}:`, error);
            throw error;
        }
    }

    async unarchive(id: string): Promise<Thread | undefined> {
        try {
            return await this.update(id, { isArchived: false });
        } catch (error) {
            console.error(`Error unarchiving thread with id ${id}:`, error);
            throw error;
        }
    }
}
