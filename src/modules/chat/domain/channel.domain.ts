/**
 * Domain entities and interfaces for Channel
 */

export interface Channel {
    id: string;
    name: string;
    description: string | null;
    isPrivate: boolean | null;
    imageUrl: string | null;
    category: string;
    ownerId: string;
    createdAt: Date;
}

export interface CreateChannelData {
    name: string;
    description?: string | null;
    isPrivate?: boolean;
    imageUrl?: string;
    category?: string;
    ownerId: string;
}

export interface UpdateChannelData {
    name?: string;
    description?: string | null;
    isPrivate?: boolean;
    imageUrl?: string;
    category?: string;
}
