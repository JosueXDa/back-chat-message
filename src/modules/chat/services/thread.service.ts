import { ThreadRepository } from "../repositories/thread.repository";
import type { CreateThreadData, UpdateThreadData, Thread } from "../domain";
import { ChannelMemberRepository } from "../repositories/channel-member.repository";

export class ThreadService {
    constructor(
        private readonly threadRepository: ThreadRepository,
        private readonly channelMemberRepository: ChannelMemberRepository
    ) { }

    async createThread(data: CreateThreadData): Promise<Thread> {
        try {
            // Verificar que el usuario sea miembro del canal
            const isMember = await this.channelMemberRepository.isJoined(data.channelId, data.createdBy);
            if (!isMember) {
                throw new Error("User must be a member of the channel to create a thread");
            }

            const thread = await this.threadRepository.create(data);
            return thread;
        } catch (error) {
            console.error("Error in service creating thread:", error);
            throw error;
        }
    }

    async updateThread(id: string, userId: string, data: UpdateThreadData): Promise<Thread> {
        try {
            const thread = await this.threadRepository.findById(id);
            if (!thread) {
                throw new Error("Thread not found");
            }

            // Verificar permisos: debe ser el creador o admin/moderator
            const isMember = await this.channelMemberRepository.isJoined(thread.channelId, userId);
            if (!isMember) {
                throw new Error("User is not a member of this channel");
            }

            const hasPermission = 
                thread.createdBy === userId ||
                await this.channelMemberRepository.hasPermission(thread.channelId, userId, 'moderator');

            if (!hasPermission) {
                throw new Error("Insufficient permissions to update this thread");
            }

            const updatedThread = await this.threadRepository.update(id, data);
            if (!updatedThread) {
                throw new Error("Thread not found");
            }

            return updatedThread;
        } catch (error) {
            console.error(`Error in service updating thread ${id}:`, error);
            throw error;
        }
    }

    async deleteThread(id: string, userId: string): Promise<void> {
        try {
            const thread = await this.threadRepository.findById(id);
            if (!thread) {
                throw new Error("Thread not found");
            }

            // Solo admins o el creador pueden eliminar
            const hasPermission = 
                thread.createdBy === userId ||
                await this.channelMemberRepository.hasPermission(thread.channelId, userId, 'admin');

            if (!hasPermission) {
                throw new Error("Insufficient permissions to delete this thread");
            }

            await this.threadRepository.delete(id);
        } catch (error) {
            console.error(`Error in service deleting thread ${id}:`, error);
            throw error;
        }
    }

    async getThreadsByChannel(channelId: string, userId: string): Promise<Thread[]> {
        try {
            // Verificar que el usuario sea miembro
            const isMember = await this.channelMemberRepository.isJoined(channelId, userId);
            if (!isMember) {
                throw new Error("User is not a member of this channel");
            }

            return await this.threadRepository.findByChannel(channelId);
        } catch (error) {
            console.error(`Error in service getting threads for channel ${channelId}:`, error);
            throw error;
        }
    }

    async getActiveThreadsByChannel(channelId: string, userId: string): Promise<Thread[]> {
        try {
            const isMember = await this.channelMemberRepository.isJoined(channelId, userId);
            if (!isMember) {
                throw new Error("User is not a member of this channel");
            }

            return await this.threadRepository.findActiveByChannel(channelId);
        } catch (error) {
            console.error(`Error in service getting active threads for channel ${channelId}:`, error);
            throw error;
        }
    }

    async archiveThread(id: string, userId: string): Promise<Thread> {
        try {
            const thread = await this.threadRepository.findById(id);
            if (!thread) {
                throw new Error("Thread not found");
            }

            // Solo admins pueden archivar
            const hasPermission = await this.channelMemberRepository.hasPermission(thread.channelId, userId, 'admin');
            if (!hasPermission) {
                throw new Error("Insufficient permissions to archive this thread");
            }

            const archivedThread = await this.threadRepository.archive(id);
            if (!archivedThread) {
                throw new Error("Thread not found");
            }

            return archivedThread;
        } catch (error) {
            console.error(`Error in service archiving thread ${id}:`, error);
            throw error;
        }
    }

    async unarchiveThread(id: string, userId: string): Promise<Thread> {
        try {
            const thread = await this.threadRepository.findById(id);
            if (!thread) {
                throw new Error("Thread not found");
            }

            const hasPermission = await this.channelMemberRepository.hasPermission(thread.channelId, userId, 'admin');
            if (!hasPermission) {
                throw new Error("Insufficient permissions to unarchive this thread");
            }

            const unarchivedThread = await this.threadRepository.unarchive(id);
            if (!unarchivedThread) {
                throw new Error("Thread not found");
            }

            return unarchivedThread;
        } catch (error) {
            console.error(`Error in service unarchiving thread ${id}:`, error);
            throw error;
        }
    }

    async getThreadById(id: string, userId: string): Promise<Thread> {
        try {
            const thread = await this.threadRepository.findById(id);
            if (!thread) {
                throw new Error("Thread not found");
            }

            // Si userId es "system", bypass de permisos (para uso interno del gateway)
            if (userId !== "system") {
                // Verificar que el usuario sea miembro del canal
                const isMember = await this.channelMemberRepository.isJoined(thread.channelId, userId);
                if (!isMember) {
                    throw new Error("User is not a member of this channel");
                }
            }

            return thread;
        } catch (error) {
            console.error(`Error in service getting thread ${id}:`, error);
            throw error;
        }
    }
}
