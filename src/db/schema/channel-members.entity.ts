import { pgTable, uuid, text, timestamp, primaryKey, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users.entity";
import { channels } from "./channels.entity";
import { relations } from "drizzle-orm";

// Enum para los roles dentro de un canal (el owner se maneja en channels.ownerId)
export const channelRoleEnum = pgEnum('channel_role', ['admin', 'moderator', 'member']);

export const channelMembers = pgTable('channel_members', {
    channelId: uuid('channel_id').references(() => channels.id, { onDelete: 'cascade' }).notNull(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    role: channelRoleEnum('role').default('member').notNull(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (t) => [
    primaryKey({ columns: [t.channelId, t.userId] }),
]);

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