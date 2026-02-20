/**
 * Domain entities and interfaces for Channel Member
 */

export type ChannelRole = 'admin' | 'moderator' | 'member';

export interface ChannelMember {
    channelId: string;
    userId: string;
    role: ChannelRole;
    joinedAt: Date;
}

export interface CreateChannelMemberData {
    channelId: string;
    userId: string;
    role?: ChannelRole;
}

export interface UpdateChannelMemberRoleData {
    role: ChannelRole;
}
