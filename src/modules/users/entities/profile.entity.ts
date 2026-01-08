export interface Profile {
    id: string;
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    bannerUrl: string | null;
    bio: string | null;
    age: number | null;
    isOnline: boolean | null;
    createdAt: string | Date;
    updatedAt: string | Date;
}
