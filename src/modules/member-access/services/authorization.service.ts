import type { IChannelMemberRepository } from "../repositories/channel-member.repository";
import {
    UnauthorizedChannelAccessError,
    InsufficientPermissionsError
} from "../errors/access.errors";


export class AuthorizationService {
    constructor(
        private readonly channelMemberRepository: IChannelMemberRepository
    ) { }

    async requireChannelMembership(channelId: string, userId: string): Promise<void> {
        const isMember = await this.channelMemberRepository.isJoined(channelId, userId);
        if (!isMember) {
            throw new UnauthorizedChannelAccessError(channelId, userId);
        }
    }


    async requirePermission(channelId: string, userId: string, level: 'moderator' | 'admin'): Promise<void> {
        const hasPermission = await this.channelMemberRepository.hasPermission(channelId, userId, level);
        if (!hasPermission) {
            throw new InsufficientPermissionsError(level, 'perform this action');
        }
    }

    async requireOwnerOrPermission(
        channelId: string,
        userId: string,
        creatorId: string,
        level: 'moderator' | 'admin' = 'moderator'
    ): Promise<void> {
        // Si es el creador, permitir
        if (userId === creatorId) {
            return;
        }

        // Si no es creador, verificar permisos
        const hasPermission = await this.channelMemberRepository.hasPermission(channelId, userId, level);
        if (!hasPermission) {
            throw new InsufficientPermissionsError(level, `access this resource as owner or ${level}`);
        }
    }


    async isChannelMember(channelId: string, userId: string): Promise<boolean> {
        return await this.channelMemberRepository.isJoined(channelId, userId);
    }

    async hasPermission(channelId: string, userId: string, level: 'moderator' | 'admin'): Promise<boolean> {
        return await this.channelMemberRepository.hasPermission(channelId, userId, level);
    }
}
