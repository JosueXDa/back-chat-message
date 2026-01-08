import { channels } from "@/db/schema/channels.entity";
import { channelMembers } from "@/db/schema/channel-members.entity";
import { db } from "@/db";
import { eq, sql } from "drizzle-orm";
import type { Channel, CreateChannelData, UpdateChannelData } from "../entities";

export class ChannelRepository {
    async create(data: CreateChannelData): Promise<Channel> {
        try {
            if (!data.ownerId) {
                throw new Error("Owner ID is required");
            }

            const [newChannel] = await db.insert(channels).values({
                name: data.name,
                description: data.description,
                isPrivate: data.isPrivate,
                imageUrl: data.imageUrl,
                bannerUrl: data.bannerUrl,
                category: data.category,
                ownerId: data.ownerId,
            }).returning();

            return newChannel;
        } catch (error) {
            console.error("Error creating channel:", error);
            throw error;
        }
    }

    async update(id: string, data: UpdateChannelData): Promise<Channel | undefined> {
        try {
            const updateData: Partial<typeof channels.$inferInsert> = {};

            if (data.name !== undefined) updateData.name = data.name;
            if (data.description !== undefined) updateData.description = data.description;
            if (data.isPrivate !== undefined) updateData.isPrivate = data.isPrivate;
            if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
            if (data.bannerUrl !== undefined) updateData.bannerUrl = data.bannerUrl;

            if (Object.keys(updateData).length === 0) {
                return this.findById(id);
            }

            const [updatedChannel] = await db
                .update(channels)
                .set(updateData)
                .where(eq(channels.id, id))
                .returning();

            return updatedChannel;
        } catch (error) {
            console.error(`Error updating channel with id ${id}:`, error);
            throw error;
        }
    }

    async delete(id: string): Promise<Channel | undefined> {
        try {
            const [deletedChannel] = await db
                .delete(channels)
                .where(eq(channels.id, id))
                .returning();

            return deletedChannel;
        } catch (error) {
            console.error(`Error deleting channel with id ${id}:`, error);
            throw error;
        }
    }

    async findById(id: string): Promise<Channel | undefined> {
        try {
            const [channel] = await db
                .select()
                .from(channels)
                .where(eq(channels.id, id));

            return channel;
        } catch (error) {
            console.error(`Error finding channel with id ${id}:`, error);
            throw error;
        }
    }



    async findAll(page: number = 1, limit: number = 10): Promise<{ data: Channel[], total: number }> {
        try {
            const offset = (page - 1) * limit;

            const [data, totalCount] = await Promise.all([
                db.select()
                    .from(channels)
                    .limit(limit)
                    .offset(offset),
                db.select({ count: sql<number>`count(*)` })
                    .from(channels)
                    .then(res => Number(res[0]?.count ?? 0))
            ]);

            return { data, total: totalCount };
        } catch (error) {
            console.error("Error finding all channels:", error);
            throw error;
        }
    }

    async addMember(channelId: string, userId: string): Promise<void> {
        try {
            await db.insert(channelMembers).values({
                channelId,
                userId,
            });
        } catch (error) {
            console.error(`Error adding member ${userId} to channel ${channelId}:`, error);
            throw error;
        }
    }

    async deleteAllMembers(channelId: string): Promise<void> {
        try {
            await db.delete(channelMembers).where(eq(channelMembers.channelId, channelId));
        } catch (error) {
            console.error(`Error deleting all members from channel ${channelId}:`, error);
            throw error;
        }
    }
}