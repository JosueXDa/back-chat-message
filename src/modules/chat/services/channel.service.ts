import { ChannelRepository } from "../repositories/channel.repository";
import type { Channel, CreateChannelData, UpdateChannelData } from "../domain";


export class ChannelService {
    constructor(private readonly channelRepository: ChannelRepository) { }

    async createChannel(data: CreateChannelData): Promise<Channel> {
        try {
            // El trigger add_channel_owner_as_admin automáticamente
            // agrega al owner como 'admin' en channel_members
            const newChannel = await this.channelRepository.create(data);
            return newChannel;
        } catch (error) {
            console.error("Error in service creating channel:", error);
            throw error;
        }
    }

    async getAllChannels(page: number = 1, limit: number = 10): Promise<{
        data: Channel[];
        meta: { total: number; page: number; limit: number; totalPages: number }
    }> {
        try {
            const { data, total } = await this.channelRepository.findAll(page, limit);
            const totalPages = Math.ceil(total / limit);

            return {
                data,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages
                }
            };
        } catch (error) {
            console.error("Error in service getting all channels:", error);
            throw error;
        }
    }

    async getChannelById(id: string): Promise<Channel | null> {
        try {
            const channel = await this.channelRepository.findById(id);
            return channel || null;
        } catch (error) {
            console.error(`Error in service getting channel ${id}:`, error);
            throw error;
        }
    }

    async updateChannel(id: string, data: UpdateChannelData): Promise<Channel | null> {
        try {
            const existing = await this.channelRepository.findById(id);
            if (!existing) {
                return null;
            }

            const updatedRow = await this.channelRepository.update(id, data);
            return updatedRow || null;
        } catch (error) {
            console.error(`Error in service updating channel ${id}:`, error);
            throw error;
        }
    }

    async deleteChannel(id: string): Promise<boolean> {
        try {
            const existing = await this.channelRepository.findById(id);
            if (!existing) {
                return false;
            }

            // CASCADE se encarga de eliminar:
            // - channel_members
            // - threads
            //   - messages (de cada thread)
            await this.channelRepository.delete(id);
            return true;
        } catch (error) {
            console.error(`Error in service deleting channel ${id}:`, error);
            throw error;
        }
    }
}