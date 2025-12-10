import { ChannelRepository } from "../repositories/channel.repository";
import { CreateChannelDto } from "../dtos/create-channel.dto";
import { ChannelRow } from "../repositories/channel.repository";


export class ChannelService {
    constructor(private readonly channelRepository: ChannelRepository) { }

    async createChannel(data: CreateChannelDto): Promise<ChannelRow> {
        try {
            const newChannel = await this.channelRepository.create(data);
            if (data.ownerId) {
                await this.channelRepository.addMember(newChannel.channel.id, data.ownerId);
            }
            return newChannel;
        } catch (error) {
            console.error("Error in service creating channel:", error);
            throw error;
        }
    }

    async getAllChannels(page: number = 1, limit: number = 10): Promise<{
        data: ChannelRow[];
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

    async getChannelById(id: string): Promise<ChannelRow | null> {
        try {
            const channel = await this.channelRepository.findById(id);
            return channel || null;
        } catch (error) {
            console.error(`Error in service getting channel ${id}:`, error);
            throw error;
        }
    }

    async updateChannel(id: string, data: CreateChannelDto): Promise<ChannelRow | null> {
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

            await this.channelRepository.deleteAllMembers(id);
            await this.channelRepository.delete(id);
            return true;
        } catch (error) {
            console.error(`Error in service deleting channel ${id}:`, error);
            throw error;
        }
    }
}