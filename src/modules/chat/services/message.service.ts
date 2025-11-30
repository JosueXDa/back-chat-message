import { MessageRepository, MessageRow } from "../repositories/message.repository";
import { CreateMessageDto } from "../dtos/create-message.dto";

export class MessageService {
    constructor(private readonly messageRepository: MessageRepository) { }

    async createMessage(data: CreateMessageDto): Promise<MessageRow> {
        try {
            return await this.messageRepository.create(data);
        } catch (error) {
            console.error("Error in service creating message:", error);
            throw error;
        }
    }

    async getMessagesByChannel(channelId: string): Promise<MessageRow[]> {
        try {
            return await this.messageRepository.findByChannel(channelId);
        } catch (error) {
            console.error(`Error in service getting messages for channel ${channelId}:`, error);
            throw error;
        }
    }
}
