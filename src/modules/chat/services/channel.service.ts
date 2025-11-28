import { ChannelRepository } from "../repositories/channel.repository";
import { CreateChannelDto } from "../dtos/create-channel.dto";
import { ChannelRow } from "../repositories/channel.repository";


export class ChannelService {
    constructor(private readonly channelRepository: ChannelRepository) { }

    async createChannel(data: CreateChannelDto): Promise<ChannelRow> {
        return this.channelRepository.create(data);
    }

    async getAllChannels(): Promise<ChannelRow[]> {
        return this.channelRepository.findAll();
    }

    async getChannelById(id: string): Promise<ChannelRow | null> {
        const channel = await this.channelRepository.findById(id);
        return channel || null;
    }

    async updateChannel(id: string, data: CreateChannelDto): Promise<ChannelRow | null> {
        const existing = await this.channelRepository.findById(id);
        if (!existing) {
            return null;
        }

        const updatedRow = await this.channelRepository.update(id, data);
        return updatedRow || null;
    }

    async deleteChannel(id: string): Promise<boolean> {
        const existing = await this.channelRepository.findById(id);
        if (!existing) {
            return false;
        }

        await this.channelRepository.delete(id);
        return true;
    }
}