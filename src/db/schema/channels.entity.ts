import { relations } from "drizzle-orm";
import { pgTable, uuid, text, timestamp, boolean, varchar } from "drizzle-orm/pg-core";
import { messages } from "./messages.entity";
import { channelMembers } from "./channel-members.entity";

export const channels = pgTable('channels', {
    id: uuid().defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    isPrivate: boolean('is_private').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const channelsRelations = relations(channels, ({ many }) => ({
    messages: many(messages),
    channelMembers: many(channelMembers),
}));