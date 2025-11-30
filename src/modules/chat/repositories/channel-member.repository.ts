import { db } from "../../../db/index";
import { channelMembers } from "../../../db/schema/channel-members.entity";
import { eq, and } from "drizzle-orm";
import { CreateMemberChannelDto } from "../dtos/create-member-cahnnel.dto";

export type ChannelMemberRow = {
    member: typeof channelMembers.$inferSelect;
};

export class ChannelMemberRepository {
    async create(data: CreateMemberChannelDto): Promise<ChannelMemberRow> {
        try {
            const [newMember] = await db.insert(channelMembers).values({
                channelId: data.channelId,
                userId: data.userId,
            }).returning();

            return { member: newMember };
        } catch (error) {
            console.error("Error creating channel member:", error);
            throw error;
        }
    }

    async delete(channelId: string, userId: string): Promise<ChannelMemberRow | undefined> {
        try {
            const [deletedMember] = await db.delete(channelMembers).where(
                and(
                    eq(channelMembers.channelId, channelId),
                    eq(channelMembers.userId, userId)
                )
            ).returning();

            if (!deletedMember) return undefined;

            return { member: deletedMember };
        } catch (error) {
            console.error(`Error deleting channel member with channelId ${channelId} and userId ${userId}:`, error);
            throw error;
        }
    }

    async getMembersByChannelId(channelId: string): Promise<ChannelMemberRow[]> {
        try {
            return await db.select({ member: channelMembers }).from(channelMembers).where(eq(channelMembers.channelId, channelId));
        } catch (error) {
            console.error(`Error getting members by channel id ${channelId}:`, error);
            throw error;
        }
    }
}