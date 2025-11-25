import { pgTable, uuid, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { users } from "./users.entity";
import { relations } from "drizzle-orm";

export const profile = pgTable('profiles', {
    id: uuid().defaultRandom().primaryKey(),
    userId: text('user_id').references(() => users.id).notNull().unique(),
    displayName: text('display_name').notNull(),
    avatarUrl: text('avatar_url'),
    bio: text('bio'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    age: integer('age'),
    isOnline: boolean('is_online').default(false),
});

export const profileRelations = relations(profile, ({ one }) => ({
    user: one(users, {
        fields: [profile.userId],
        references: [users.id],
    })
}))