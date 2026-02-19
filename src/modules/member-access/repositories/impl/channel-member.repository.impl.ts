import { db } from "@/db/index";
import { channelMembers } from "@/db/schema/channel-members.entity";
import { channels } from "@/db/schema/channels.entity";
import { eq, and } from "drizzle-orm";
import type { ChannelMember, ChannelRole, CreateChannelMemberData } from "../../entities/channel-member.entity";
import { IChannelMemberRepository } from "../channel-member.repository";

export class ChannelMemberRepositoryImpl implements IChannelMemberRepository {
    async create(data: CreateChannelMemberData): Promise<ChannelMember> {
        try {
            const [newMember] = await db.insert(channelMembers).values({
                channelId: data.channelId,
                userId: data.userId,
                role: data.role || 'member',
            }).returning();

            return newMember;
        } catch (error) {
            console.error("Error creating channel member:", error);
            throw error;
        }
    }

    async updateRole(channelId: string, userId: string, role: ChannelRole): Promise<ChannelMember | undefined> {
        try {
            const [updatedMember] = await db
                .update(channelMembers)
                .set({ role })
                .where(
                    and(
                        eq(channelMembers.channelId, channelId),
                        eq(channelMembers.userId, userId)
                    )
                )
                .returning();

            return updatedMember;
        } catch (error) {
            console.error(`Error updating role for user ${userId} in channel ${channelId}:`, error);
            throw error;
        }
    }

    async delete(channelId: string, userId: string): Promise<ChannelMember | undefined> {
        try {
            const [deletedMember] = await db.delete(channelMembers).where(
                and(
                    eq(channelMembers.channelId, channelId),
                    eq(channelMembers.userId, userId)
                )
            ).returning();

            return deletedMember;
        } catch (error) {
            console.error(`Error deleting channel member with channelId ${channelId} and userId ${userId}:`, error);
            throw error;
        }
    }

    async getMembersByChannelId(channelId: string): Promise<ChannelMember[]> {
        try {
            return await db.select().from(channelMembers).where(eq(channelMembers.channelId, channelId));
        } catch (error) {
            console.error(`Error getting members by channel id ${channelId}:`, error);
            throw error;
        }
    }

    async getMemberRole(channelId: string, userId: string): Promise<ChannelRole | undefined> {
        try {
            const [result] = await db
                .select()
                .from(channelMembers)
                .where(
                    and(
                        eq(channelMembers.channelId, channelId),
                        eq(channelMembers.userId, userId)
                    )
                );

            return result?.role;
        } catch (error) {
            console.error(`Error getting role for user ${userId} in channel ${channelId}:`, error);
            throw error;
        }
    }

    async isJoined(channelId: string, userId: string): Promise<boolean> {
        try {
            const member = await db.select().from(channelMembers).where(
                and(
                    eq(channelMembers.channelId, channelId),
                    eq(channelMembers.userId, userId)
                )
            );

            return !!member.length;
        } catch (error) {
            console.error(`Error checking if user ${userId} is joined to channel ${channelId}:`, error);
            throw error;
        }
    }

    async hasPermission(channelId: string, userId: string, requiredRole: ChannelRole): Promise<boolean> {
        try {
            const role = await this.getMemberRole(channelId, userId);
            if (!role) return false;

            // Jerarquía de roles: admin > moderator > member
            const roleHierarchy: Record<ChannelRole, number> = {
                'admin': 3,
                'moderator': 2,
                'member': 1,
            };

            return roleHierarchy[role] >= roleHierarchy[requiredRole];
        } catch (error) {
            console.error(`Error checking permissions for user ${userId} in channel ${channelId}:`, error);
            throw error;
        }
    }

    async getChannelsByUserId(userId: string) {
        try {
            const result = await db.select({
                channel: channels
            })
                .from(channelMembers)
                .innerJoin(channels, eq(channelMembers.channelId, channels.id))
                .where(eq(channelMembers.userId, userId));

            return result.map(r => r.channel);
        } catch (error) {
            console.error(`Error getting channels by user id ${userId}:`, error);
            throw error;
        }
    }
}
