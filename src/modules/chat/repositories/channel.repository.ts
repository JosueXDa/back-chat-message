import type { Channel, CreateChannelData, UpdateChannelData } from '../entities';

export interface IChannelRepository {
    create(data: CreateChannelData): Promise<Channel>;
    update(id: string, data: UpdateChannelData): Promise<Channel | undefined>;
    delete(id: string): Promise<Channel | undefined>;
    findById(id: string): Promise<Channel | undefined>;
    findAll(page?: number, limit?: number): Promise<{ data: Channel[], total: number }>;
    addMember(channelId: string, userId: string): Promise<void>;
    deleteAllMembers(channelId: string): Promise<void>;
}