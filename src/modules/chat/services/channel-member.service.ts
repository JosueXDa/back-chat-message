import { ChannelMemberRepository } from "../repositories/channel-member.repository";
import type { ChannelMember, ChannelRole, CreateChannelMemberData, Channel } from "../domain";

export class ChannelMemberService {
    constructor(private readonly channelMemberRepository: ChannelMemberRepository) { }

    async createMember(data: CreateChannelMemberData, requestUserId: string): Promise<ChannelMember> {
        try {
            // Solo admins pueden agregar miembros
            const hasPermission = await this.channelMemberRepository.hasPermission(data.channelId, requestUserId, 'admin');
            if (!hasPermission) {
                throw new Error("Insufficient permissions to add members");
            }

            return await this.channelMemberRepository.create(data);
        } catch (error) {
            console.error("Error in service creating channel member:", error);
            throw error;
        }
    }

    async updateMemberRole(channelId: string, userId: string, role: ChannelRole, requestUserId: string): Promise<ChannelMember> {
        try {
            // Solo admins pueden cambiar roles
            const hasPermission = await this.channelMemberRepository.hasPermission(channelId, requestUserId, 'admin');
            if (!hasPermission) {
                throw new Error("Insufficient permissions to update roles");
            }

            const updated = await this.channelMemberRepository.updateRole(channelId, userId, role);
            if (!updated) {
                throw new Error("Member not found");
            }

            return updated;
        } catch (error) {
            console.error(`Error in service updating role for user ${userId} in channel ${channelId}:`, error);
            throw error;
        }
    }

    async deleteMember(channelId: string, userId: string, requestUserId: string): Promise<ChannelMember | undefined> {
        try {
            // Admins pueden remover a cualquiera, o el usuario puede removerse a sí mismo
            const isAdmin = await this.channelMemberRepository.hasPermission(channelId, requestUserId, 'admin');
            const isSelf = requestUserId === userId;

            if (!isAdmin && !isSelf) {
                throw new Error("Insufficient permissions to remove this member");
            }

            return await this.channelMemberRepository.delete(channelId, userId);
        } catch (error) {
            console.error(`Error in service deleting channel member ${channelId} for user ${userId}:`, error);
            throw error;
        }
    }

    async getMembersByChannelId(channelId: string, requestUserId: string): Promise<ChannelMember[]> {
        try {
            // Solo miembros del canal pueden ver la lista
            const isMember = await this.channelMemberRepository.isJoined(channelId, requestUserId);
            if (!isMember) {
                throw new Error("User is not a member of this channel");
            }

            return await this.channelMemberRepository.getMembersByChannelId(channelId);
        } catch (error) {
            console.error(`Error in service getting members by channel id ${channelId}:`, error);
            throw error;
        }
    }

    async getMemberRole(channelId: string, userId: string): Promise<ChannelRole | undefined> {
        try {
            return await this.channelMemberRepository.getMemberRole(channelId, userId);
        } catch (error) {
            console.error(`Error in service getting role for user ${userId} in channel ${channelId}:`, error);
            throw error;
        }
    }

    async getChannelsByUserId(userId: string): Promise<Channel[]> {
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

    async hasPermission(channelId: string, userId: string, requiredRole: ChannelRole): Promise<boolean> {
        try {
            return await this.channelMemberRepository.hasPermission(channelId, userId, requiredRole);
        } catch (error) {
            console.error(`Error in service checking permissions for user ${userId} in channel ${channelId}:`, error);
            throw error;
        }
    }
}
