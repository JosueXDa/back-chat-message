import { pgTable, text, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users.entity";
import { channels } from "./channels.entity";
import { relations } from "drizzle-orm";

export const messages = pgTable('messages', {
    id: uuid().defaultRandom().primaryKey(),
    senderId: text('sender_id').references(() => users.id).notNull(),
    channelId: uuid('channel_id').references(() => channels.id).notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
    sender: one(users, {
        fields: [messages.senderId],
        references: [users.id],
    }),
    channel: one(channels, {
        fields: [messages.channelId],
        references: [channels.id],
    })
}))