/**
 * Domain entities and interfaces for Thread
 */

export interface Thread {
    id: string;
    channelId: string;
    name: string;
    description: string | null;
    createdBy: string;
    isArchived: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateThreadData {
    channelId: string;
    name: string;
    description?: string;
    createdBy: string;
}

export interface UpdateThreadData {
    name?: string;
    description?: string;
    isArchived?: boolean;
}
