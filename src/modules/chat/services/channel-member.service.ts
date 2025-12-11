import { ChannelMemberRepository } from "../repositories/channel-member.repository";
import { CreateMemberChannelDto } from "../dtos/create-member-cahnnel.dto";
import { ChannelMemberRow } from "../repositories/channel-member.repository";

export class ChannelMemberService {
    constructor(private readonly channelMemberRepository: ChannelMemberRepository) { }

    async createMember(data: CreateMemberChannelDto): Promise<ChannelMemberRow> {
        try {
            return await this.channelMemberRepository.create(data);
        } catch (error) {
            console.error("Error in service creating channel member:", error);
            throw error;
        }
    }

    async deleteMember(channelId: string, userId: string): Promise<ChannelMemberRow | undefined> {
        try {
            return await this.channelMemberRepository.delete(channelId, userId);
        } catch (error) {
            console.error(`Error in service deleting channel member ${channelId} for user ${userId}:`, error);
            throw error;
        }
    }

    async getMembersByChannelId(channelId: string): Promise<ChannelMemberRow[]> {
        try {
            return await this.channelMemberRepository.getMembersByChannelId(channelId);
        } catch (error) {
            console.error(`Error in service getting members by channel id ${channelId}:`, error);
            throw error;
        }
    }

    async getChannelsByUserId(userId: string) {
        try {
            return await this.channelMemberRepository.getChannelsByUserId(userId);
        } catch (error) {
            console.error(`Error in service getting channels by user id ${userId}:`, error);
            throw error;
        }
    }

    async isJoined(channelId: string, userId: string): Promise<boolean> {
        try {
            return await this.channelMemberRepository.isJoined(channelId, userId);
        } catch (error) {
            console.error(`Error in service checking if user ${userId} is joined to channel ${channelId}:`, error);
            throw error;
        }
    }
}
