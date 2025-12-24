import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, unique } from "drizzle-orm/pg-core";
import { accounts } from "./accounts.entity";
import { messages } from "./messages.entity";
import { profile } from "./profile.entity";
import { sessions } from "./sessions.entity";
import { channelMembers } from "./channel-members.entity";
import { channels } from "./channels.entity";

export const users = pgTable("user", {
    id: text().primaryKey().notNull(),
    email: text().notNull(),
    createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
    name: text().notNull(),
    emailVerified: boolean("email_verified").notNull(),
    updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    unique("user_email_unique").on(table.email),
]);

export const userRelations = relations(users, ({ many, one }) => ({
    accounts: many(accounts),
    messages: many(messages),
    profile: one(profile, {
        fields: [users.id],
        references: [profile.userId],
    }),
    sessions: many(sessions),
    channelMembers: many(channelMembers),
    ownedChannels: many(channels),
}));