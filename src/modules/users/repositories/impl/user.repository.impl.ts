import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema/users.entity";
import { profile as profiles } from "@/db/schema/profile.entity";
import { UpdateUserDto } from "@/users/dtos/update-user.dto";
import type { User, Profile, UserWithProfile } from "@/users/entities";
import type { IUserRepository } from "../user.repository.interface";
import { ProfileCreationError, UserRepositoryError } from "@/users/errors/user.errors";

export class UserRepositoryImpl implements IUserRepository {
    async findAll(): Promise<UserWithProfile[]> {
        const rows = await db
            .select({ user: users, profile: profiles })
            .from(users)
            .leftJoin(profiles, eq(profiles.userId, users.id));

        return rows.map(row => this.mapRowToUserWithProfile(row));
    }

    async findById(id: string): Promise<UserWithProfile | undefined> {
        const [row] = await db
            .select({ user: users, profile: profiles })
            .from(users)
            .leftJoin(profiles, eq(profiles.userId, users.id))
            .where(eq(users.id, id));

        return row ? this.mapRowToUserWithProfile(row) : undefined;
    }

    async update(id: string, data: UpdateUserDto): Promise<UserWithProfile | undefined> {
        try {
            return await db.transaction(async (tx) => {
                const userUpdates: Partial<typeof users.$inferInsert> = {};

                if (data.email !== undefined) userUpdates.email = data.email;
                if (data.name !== undefined) userUpdates.name = data.name;
                if (data.emailVerified !== undefined) userUpdates.emailVerified = data.emailVerified;

                if (Object.keys(userUpdates).length > 0) {
                    await tx.update(users).set(userUpdates).where(eq(users.id, id));
                }

                if (data.profile) {
                    const profileData = data.profile;
                    const [existingProfile] = await tx.select().from(profiles).where(eq(profiles.userId, id));

                    const profileUpdates: Partial<typeof profiles.$inferInsert> = {};

                    if (profileData.displayName !== undefined) profileUpdates.displayName = profileData.displayName;
                    if (profileData.avatarUrl !== undefined) profileUpdates.avatarUrl = profileData.avatarUrl ?? null;
                    if (profileData.bannerUrl !== undefined) profileUpdates.bannerUrl = profileData.bannerUrl ?? null;
                    if (profileData.bio !== undefined) profileUpdates.bio = profileData.bio ?? null;
                    if (profileData.age !== undefined) profileUpdates.age = profileData.age ?? null;
                    if (profileData.isOnline !== undefined) profileUpdates.isOnline = profileData.isOnline;

                    profileUpdates.updatedAt = new Date();

                    if (existingProfile) {
                        await tx.update(profiles).set(profileUpdates).where(eq(profiles.userId, id));
                    } else {
                        if (profileData.displayName === undefined) {
                            throw new ProfileCreationError("displayName is required to create a profile");
                        }

                        await tx.insert(profiles).values({
                            userId: id,
                            displayName: profileData.displayName,
                            avatarUrl: profileData.avatarUrl ?? null,
                            bannerUrl: profileData.bannerUrl ?? null,
                            bio: profileData.bio ?? null,
                            age: profileData.age ?? null,
                            isOnline: profileData.isOnline ?? false,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        });
                    }
                }

                const [row] = await tx
                    .select({ user: users, profile: profiles })
                    .from(users)
                    .leftJoin(profiles, eq(profiles.userId, users.id))
                    .where(eq(users.id, id));

                return row ? this.mapRowToUserWithProfile(row) : undefined;
            });
        } catch (error) {
            if (error instanceof ProfileCreationError) {
                throw error;
            }
            throw new UserRepositoryError("Failed to update user", error);
        }
    }

    async delete(id: string): Promise<User | undefined> {
        try {
            return await db.transaction(async (tx) => {
                await tx.delete(profiles).where(eq(profiles.userId, id));
                const [deletedUser] = await tx.delete(users).where(eq(users.id, id)).returning();
                
                return deletedUser ? this.mapUserRowToUser(deletedUser) : undefined;
            });
        } catch (error) {
            throw new UserRepositoryError("Failed to delete user", error);
        }
    }

    private mapRowToUserWithProfile(row: {
        user: typeof users.$inferSelect;
        profile: typeof profiles.$inferSelect | null;
    }): UserWithProfile {
        return {
            ...this.mapUserRowToUser(row.user),
            profile: row.profile ? this.mapProfileRowToProfile(row.profile) : null
        };
    }

    private mapUserRowToUser(userRow: typeof users.$inferSelect): User {
        return {
            id: userRow.id,
            name: userRow.name,
            email: userRow.email,
            emailVerified: userRow.emailVerified,
            image: userRow.image,
            createdAt: userRow.createdAt,
            updatedAt: userRow.updatedAt
        };
    }

    private mapProfileRowToProfile(profileRow: typeof profiles.$inferSelect): Profile {
        return {
            id: profileRow.id,
            userId: profileRow.userId,
            displayName: profileRow.displayName,
            avatarUrl: profileRow.avatarUrl,
            bannerUrl: profileRow.bannerUrl,
            bio: profileRow.bio,
            age: profileRow.age,
            isOnline: profileRow.isOnline,
            createdAt: profileRow.createdAt,
            updatedAt: profileRow.updatedAt
        };
    }
}

