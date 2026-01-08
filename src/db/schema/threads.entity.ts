import { relations } from "drizzle-orm";
import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { channels } from "./channels.entity";
import { users } from "./users.entity";
import { messages } from "./messages.entity";

export const threads = pgTable('threads', {
    id: uuid().defaultRandom().primaryKey(),
    channelId: uuid('channel_id').references(() => channels.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    description: text('description'),
    createdBy: text('created_by').references(() => users.id).notNull(),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const threadsRelations = relations(threads, ({ one, many }) => ({
    channel: one(channels, {
        fields: [threads.channelId],
        references: [channels.id],
    }),
    creator: one(users, {
        fields: [threads.createdBy],
        references: [users.id],
    }),
    messages: many(messages),
}));
