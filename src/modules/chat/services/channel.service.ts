import { ChannelRepository } from "../repositories/channel.repository";
import type { Channel, CreateChannelData, UpdateChannelData } from "../entities";
import { ChannelNotFoundError, ChatRepositoryError } from "../errors/chat.errors";


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
            throw new ChatRepositoryError("Failed to create channel", error);
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
            throw new ChatRepositoryError("Failed to get channels", error);
        }
    }

    async getChannelById(id: string): Promise<Channel> {
        try {
            const channel = await this.channelRepository.findById(id);
            
            if (!channel) {
                throw new ChannelNotFoundError(id);
            }
            
            return channel;
        } catch (error) {
            // Si ya es un error de dominio, propagarlo
            if (error instanceof ChannelNotFoundError) {
                throw error;
            }
            
            console.error(`Error in service getting channel ${id}:`, error);
            throw new ChatRepositoryError(`Failed to get channel ${id}`, error);
        }
    }

    async updateChannel(id: string, data: UpdateChannelData): Promise<Channel> {
        try {
            const existing = await this.channelRepository.findById(id);
            if (!existing) {
                throw new ChannelNotFoundError(id);
            }

            const updatedRow = await this.channelRepository.update(id, data);
            
            if (!updatedRow) {
                throw new ChatRepositoryError(`Failed to update channel ${id}`);
            }
            
            return updatedRow;
        } catch (error) {
            // Si ya es un error de dominio, propagarlo
            if (error instanceof ChannelNotFoundError || error instanceof ChatRepositoryError) {
                throw error;
            }
            
            console.error(`Error in service updating channel ${id}:`, error);
            throw new ChatRepositoryError(`Failed to update channel ${id}`, error);
        }
    }

    async deleteChannel(id: string): Promise<void> {
        try {
            const existing = await this.channelRepository.findById(id);
            if (!existing) {
                throw new ChannelNotFoundError(id);
            }

            // CASCADE se encarga de eliminar:
            // - channel_members
            // - threads
            //   - messages (de cada thread)
            await this.channelRepository.delete(id);
        } catch (error) {
            // Si ya es un error de dominio, propagarlo
            if (error instanceof ChannelNotFoundError) {
                throw error;
            }
            
            console.error(`Error in service deleting channel ${id}:`, error);
            throw new ChatRepositoryError(`Failed to delete channel ${id}`, error);
        }
    }
}