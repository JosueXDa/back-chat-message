import { MessageRepository, MessageRow } from "../repositories/message.repository";
import { CreateMessageDto } from "../dtos/create-message.dto";
import { MessageEventEmitter } from "./message-event.emitter";

export class MessageService {
    constructor(
        private readonly messageRepository: MessageRepository,
        private readonly eventEmitter: MessageEventEmitter
    ) { }

    async createMessage(data: CreateMessageDto): Promise<MessageRow> {
        try {
            const message = await this.messageRepository.create(data);
            
            // Emitir evento para que el Gateway lo broadcast por WebSocket
            // El servidor es la ÚNICA FUENTE DE VERDAD
            this.eventEmitter.emitMessageCreated(message);
            
            return message;
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

