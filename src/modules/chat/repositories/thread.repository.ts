import type { Thread, CreateThreadData, UpdateThreadData } from '../entities';

export interface IThreadRepository {
    create(data: CreateThreadData): Promise<Thread>;
    update(id: string, data: UpdateThreadData): Promise<Thread | undefined>;
    delete(id: string): Promise<Thread | undefined>;
    findById(id: string): Promise<Thread | undefined>;
    findByChannel(channelId: string): Promise<Thread[]>;
    findActiveByChannel(channelId: string): Promise<Thread[]>;
    archive(id: string): Promise<Thread | undefined>;
    unarchive(id: string): Promise<Thread | undefined>;
}