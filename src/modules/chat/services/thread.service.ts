import type { IThreadRepository } from "../repositories/thread.repository";
import type { CreateThreadData, UpdateThreadData, Thread } from "../entities";
import { AuthorizationService } from "./authorization.service";

export class ThreadService {
    constructor(
        private readonly threadRepository: IThreadRepository,
        private readonly authorizationService: AuthorizationService
    ) { }

    async createThread(data: CreateThreadData): Promise<Thread> {
        try {
            // Verificar que el usuario sea miembro del canal
            await this.authorizationService.requireChannelMembership(data.channelId, data.createdBy);

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

            // Verificar que es el creador o tiene permisos de moderador
            await this.authorizationService.requireOwnerOrPermission(
                thread.channelId,
                userId,
                thread.createdBy,
                'moderator'
            );

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
            await this.authorizationService.requireOwnerOrPermission(
                thread.channelId,
                userId,
                thread.createdBy,
                'admin'
            );

            await this.threadRepository.delete(id);
        } catch (error) {
            console.error(`Error in service deleting thread ${id}:`, error);
            throw error;
        }
    }

    async getThreadsByChannel(channelId: string, userId: string): Promise<Thread[]> {
        try {
            // Verificar que el usuario sea miembro
            await this.authorizationService.requireChannelMembership(channelId, userId);

            return await this.threadRepository.findByChannel(channelId);
        } catch (error) {
            console.error(`Error in service getting threads for channel ${channelId}:`, error);
            throw error;
        }
    }

    async getActiveThreadsByChannel(channelId: string, userId: string): Promise<Thread[]> {
        try {
            // Verificar que el usuario sea miembro
            await this.authorizationService.requireChannelMembership(channelId, userId);

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
            await this.authorizationService.requirePermission(thread.channelId, userId, 'admin');

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

            // Solo admins pueden desarchivar
            await this.authorizationService.requirePermission(thread.channelId, userId, 'admin');

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
                await this.authorizationService.requireChannelMembership(thread.channelId, userId);
            }

            return thread;
        } catch (error) {
            console.error(`Error in service getting thread ${id}:`, error);
            throw error;
        }
    }
}

