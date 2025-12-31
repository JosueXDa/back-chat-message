import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { users } from "../../../db/schema/users.entity";
import { profile as profiles } from "../../../db/schema/profile.entity";
import { UpdateUserDto } from "../dtos/update-user.dto";

export type UserRow = {
    user: typeof users.$inferSelect;
    profile: typeof profiles.$inferSelect | null;
};

export class UserRepository {
    async findAll(): Promise<UserRow[]> {
        return await db
            .select({ user: users, profile: profiles })
            .from(users)
            .leftJoin(profiles, eq(profiles.userId, users.id));
    }

    async findById(id: string): Promise<UserRow | undefined> {
        const [result] = await db
            .select({ user: users, profile: profiles })
            .from(users)
            .leftJoin(profiles, eq(profiles.userId, users.id))
            .where(eq(users.id, id));

        return result;
    }

    async update(id: string, data: UpdateUserDto): Promise<UserRow | undefined> {
        const userUpdates: Partial<typeof users.$inferInsert> = {};

        if (data.email !== undefined) userUpdates.email = data.email;
        if (data.name !== undefined) userUpdates.name = data.name;
        if (data.emailVerified !== undefined) userUpdates.emailVerified = data.emailVerified;

        if (Object.keys(userUpdates).length > 0) {
            await db.update(users).set(userUpdates).where(eq(users.id, id));
        }

        if (data.profile) {
            const profileData = data.profile;
            const [existingProfile] = await db.select().from(profiles).where(eq(profiles.userId, id));

            const profileUpdates: Partial<typeof profiles.$inferInsert> = {};

            if (profileData.displayName !== undefined) profileUpdates.displayName = profileData.displayName;
            if (profileData.avatarUrl !== undefined) profileUpdates.avatarUrl = profileData.avatarUrl ?? null;
            if (profileData.bannerUrl !== undefined) profileUpdates.bannerUrl = profileData.bannerUrl ?? null;
            if (profileData.bio !== undefined) profileUpdates.bio = profileData.bio ?? null;
            if (profileData.age !== undefined) profileUpdates.age = profileData.age ?? null;
            if (profileData.isOnline !== undefined) profileUpdates.isOnline = profileData.isOnline;

            profileUpdates.updatedAt = new Date();

            if (existingProfile) {
                await db.update(profiles).set(profileUpdates).where(eq(profiles.userId, id));
            } else {
                if (profileData.displayName === undefined) {
                    throw new Error("displayName is required to create a profile");
                }

                await db.insert(profiles).values({
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

        const [result] = await db
            .select({ user: users, profile: profiles })
            .from(users)
            .leftJoin(profiles, eq(profiles.userId, users.id))
            .where(eq(users.id, id));

        return result;
    }

    async delete(id: string) {
        await db.delete(profiles).where(eq(profiles.userId, id));
        const [deletedUser] = await db.delete(users).where(eq(users.id, id)).returning();
        return deletedUser;
    }
}