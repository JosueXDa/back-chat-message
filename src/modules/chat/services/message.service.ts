import { MessageRepository } from "../repositories/message.repository";
import type { CreateMessageData, Message, MessageWithSender } from "../domain";
import { MessageEventEmitter } from "./message-event.emitter";
import { ThreadRepository } from "../repositories/thread.repository";
import { ChannelMemberRepository } from "../repositories/channel-member.repository";

export class MessageService {
    constructor(
        private readonly messageRepository: MessageRepository,
        private readonly threadRepository: ThreadRepository,
        private readonly channelMemberRepository: ChannelMemberRepository,
        private readonly eventEmitter: MessageEventEmitter
    ) { }

    async createMessage(data: CreateMessageData): Promise<Message> {
        try {
            // Verificar que el thread existe
            const thread = await this.threadRepository.findById(data.threadId);
            if (!thread) {
                throw new Error("Thread not found");
            }

            // Verificar que el usuario es miembro del canal
            const isMember = await this.channelMemberRepository.isJoined(thread.channelId, data.senderId);
            if (!isMember) {
                throw new Error("User is not a member of this channel");
            }

            const message = await this.messageRepository.create(data);
            
            // Actualizar timestamp del thread
            await this.threadRepository.update(thread.id, {});
            
            // Obtener el mensaje completo con datos del sender para el evento
            const fullMessage = await this.messageRepository.findByIdWithSender(message.id);
            
            if (fullMessage) {
                // Emitir evento para que el Gateway lo broadcast por WebSocket
                // El servidor es la ÚNICA FUENTE DE VERDAD
                this.eventEmitter.emitMessageCreated(fullMessage);
            }
            
            return message;
        } catch (error) {
            console.error("Error in service creating message:", error);
            throw error;
        }
    }

    async getMessagesByThread(threadId: string, userId: string, limit: number = 50, offset: number = 0): Promise<MessageWithSender[]> {
        try {
            // Verificar que el thread existe
            const thread = await this.threadRepository.findById(threadId);
            if (!thread) {
                throw new Error("Thread not found");
            }

            // Verificar que el usuario es miembro del canal
            const isMember = await this.channelMemberRepository.isJoined(thread.channelId, userId);
            if (!isMember) {
                throw new Error("User is not a member of this channel");
            }

            return await this.messageRepository.findByThread(threadId, limit, offset);
        } catch (error) {
            console.error(`Error in service getting messages for thread ${threadId}:`, error);
            throw error;
        }
    }

    async deleteMessage(id: string, userId: string): Promise<void> {
        try {
            const message = await this.messageRepository.findById(id);
            if (!message) {
                throw new Error("Message not found");
            }

            // Verificar permisos: debe ser el autor o moderator/admin
            const thread = await this.threadRepository.findById(message.threadId);
            if (!thread) {
                throw new Error("Thread not found");
            }

            const canDelete = 
                message.senderId === userId ||
                await this.channelMemberRepository.hasPermission(thread.channelId, userId, 'moderator');

            if (!canDelete) {
                throw new Error("Insufficient permissions to delete this message");
            }

            await this.messageRepository.delete(id);
            this.eventEmitter.emitMessageDeleted(id, message.threadId);
        } catch (error) {
            console.error(`Error in service deleting message ${id}:`, error);
            throw error;
        }
    }
}

