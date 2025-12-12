import { relations } from "drizzle-orm";
import { pgTable, uuid, text, timestamp, boolean, varchar } from "drizzle-orm/pg-core";
import { channelMembers } from "./channel-members.entity";
import { users } from "./users.entity";
import { threads } from "./threads.entity";

export const channels = pgTable('channels', {
    id: uuid().defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    isPrivate: boolean('is_private').default(false),
    imageUrl: text('image_url'),
    category: text('category').default('General').notNull(),
    ownerId: text('owner_id').references(() => users.id).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const channelsRelations = relations(channels, ({ many, one }) => ({
    threads: many(threads),
    channelMembers: many(channelMembers),
    owner: one(users, {
        fields: [channels.ownerId],
        references: [users.id],
    }),
}));