import type { IMessageRepository } from "../repositories/message.repository";
import type { CreateMessageData, Message, MessageWithSender } from "../entities/message.entity";
import type { IThreadRepository } from "../../threads/repositories/thread.repository";
import { AuthorizationService } from "../../member-access/services/authorization.service";
import { DurableObjectNamespace } from "@cloudflare/workers-types";

export class MessageService {
    constructor(
        private readonly messageRepository: IMessageRepository,
        private readonly threadRepository: IThreadRepository,
        private readonly authorizationService: AuthorizationService
    ) { }

    async createMessage(data: CreateMessageData, chatThreadDO: DurableObjectNamespace): Promise<Message> {
        try {
            // Verificar que el thread existe
            const thread = await this.threadRepository.findById(data.threadId);
            if (!thread) {
                throw new Error("Thread not found");
            }

            // Verificar que el usuario es miembro del canal
            await this.authorizationService.requireChannelMembership(thread.channelId, data.senderId);

            const message = await this.messageRepository.create(data);

            // Actualizar timestamp del thread
            await this.threadRepository.update(thread.id, {});

            // Obtener el mensaje completo con datos del sender para el evento
            const fullMessage = await this.messageRepository.findByIdWithSender(message.id);

            if (fullMessage) {
                // Broadcast via ChatThread DO
                const threadIdStub = chatThreadDO.idFromName(message.threadId);
                const stub = chatThreadDO.get(threadIdStub);

                // Fire and forget? Or await? Await is safer for now.
                const payload = {
                    type: "NEW_MESSAGE",
                    payload: fullMessage
                };

                await stub.fetch("http://do/broadcast-message", {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
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
            await this.authorizationService.requireChannelMembership(thread.channelId, userId);

            return await this.messageRepository.findByThread(threadId, limit, offset);
        } catch (error) {
            console.error(`Error in service getting messages for thread ${threadId}:`, error);
            throw error;
        }
    }

    async deleteMessage(id: string, userId: string, chatThreadDO: DurableObjectNamespace): Promise<void> {
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

            // Verificar que es el autor o tiene permisos de moderador
            await this.authorizationService.requireOwnerOrPermission(
                thread.channelId,
                userId,
                message.senderId,
                'moderator'
            );

            await this.messageRepository.delete(id);

            // Broadcast delete via ChatThread DO
            const threadIdStub = chatThreadDO.idFromName(message.threadId);
            const stub = chatThreadDO.get(threadIdStub);

            const payload = {
                type: "MESSAGE_DELETED",
                payload: { id, threadId: message.threadId }
            };

            await stub.fetch("http://do/broadcast-message", {
                method: "POST",
                body: JSON.stringify(payload)
            });

        } catch (error) {
            console.error(`Error in service deleting message ${id}:`, error);
            throw error;
        }
    }
}

