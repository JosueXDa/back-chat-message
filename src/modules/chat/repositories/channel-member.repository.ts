import type { ChannelMember, ChannelRole, CreateChannelMemberData, Channel } from '../entities';

export interface IChannelMemberRepository {
    create(data: CreateChannelMemberData): Promise<ChannelMember>;
    updateRole(channelId: string, userId: string, role: ChannelRole): Promise<ChannelMember | undefined>;
    delete(channelId: string, userId: string): Promise<ChannelMember | undefined>;
    getMembersByChannelId(channelId: string): Promise<ChannelMember[]>;
    getMemberRole(channelId: string, userId: string): Promise<ChannelRole | undefined>;
    isJoined(channelId: string, userId: string): Promise<boolean>;
    hasPermission(channelId: string, userId: string, requiredRole: ChannelRole): Promise<boolean>;
    getChannelsByUserId(userId: string): Promise<Channel[]>;
}