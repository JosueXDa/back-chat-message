import { ChannelMemberRepository } from "../repositories/channel-member.repository";
import type { ChannelMember, ChannelRole, CreateChannelMemberData, Channel } from "../entities";
import { AuthorizationService } from "./authorization.service";

export class ChannelMemberService {
    constructor(
        private readonly channelMemberRepository: ChannelMemberRepository,
        private readonly authorizationService: AuthorizationService
    ) { }

    async createMember(data: CreateChannelMemberData, requestUserId: string): Promise<ChannelMember> {
        try {
            // Verificar si el usuario ya es miembro
            const isAlreadyMember = await this.channelMemberRepository.isJoined(data.channelId, data.userId);
            if (isAlreadyMember) {
                throw new Error("User is already a member of this channel");
            }

            // Un usuario puede unirse a sí mismo, o un admin puede agregar a otros
            const isSelf = requestUserId === data.userId;
            if (!isSelf) {
                await this.authorizationService.requirePermission(data.channelId, requestUserId, 'admin');
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
            await this.authorizationService.requirePermission(channelId, requestUserId, 'admin');

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
            const isSelf = requestUserId === userId;
            
            if (!isSelf) {
                await this.authorizationService.requirePermission(channelId, requestUserId, 'admin');
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
            await this.authorizationService.requireChannelMembership(channelId, requestUserId);

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
