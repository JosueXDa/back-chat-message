import { pgTable, text, uuid, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users.entity";
import { threads } from "./threads.entity";
import { relations } from "drizzle-orm";
import type { MessageAttachment } from "../../modules/chat/entities/message.entity";

export const messages = pgTable('messages', {
    id: uuid().defaultRandom().primaryKey(),
    senderId: text('sender_id').references(() => users.id).notNull(),
    threadId: uuid('thread_id').references(() => threads.id, { onDelete: 'cascade' }).notNull(),
    content: text('content').notNull(),
    attachments: jsonb('attachments').$type<MessageAttachment[]>().default([]),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
    sender: one(users, {
        fields: [messages.senderId],
        references: [users.id],
    }),
    thread: one(threads, {
        fields: [messages.threadId],
        references: [threads.id],
    })
}))