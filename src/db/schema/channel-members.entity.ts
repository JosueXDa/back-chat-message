import { pgTable, uuid, text, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./users.entity";
import { channels } from "./channels.entity";
import { relations } from "drizzle-orm";

export const channelMembers = pgTable('channel_members', {
    channelId: uuid('channel_id').references(() => channels.id).notNull(),
    userId: text('user_id').references(() => users.id).notNull(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (t) => ({
    pk: primaryKey({ columns: [t.channelId, t.userId] }),
}));

export const channelMembersRelations = relations(channelMembers, ({ one }) => ({
    user: one(users, {
        fields: [channelMembers.userId],
        references: [users.id],
    }),
    channel: one(channels, {
        fields: [channelMembers.channelId],
        references: [channels.id],
    })
}))