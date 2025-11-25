import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, unique } from "drizzle-orm/pg-core";
import { accounts } from "./accounts.entity";
import { messages } from "./messages.entity";
import { profile } from "./profile.entity";
import { sessions } from "./sessions.entity";
import { channelMembers } from "./channel-members.entity";

export const user = pgTable("user", {
    id: text().primaryKey().notNull(),
    email: text().notNull(),
    createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
    name: text().notNull(),
    emailVerified: boolean("email_verified").notNull(),
    image: text(),
    updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    unique("user_email_unique").on(table.email),
]);

export const userRelations = relations(user, ({ many }) => ({
    accounts: many(accounts),
    messages: many(messages),
    profiles: many(profile),
    sessions: many(sessions),
    channelMembers: many(channelMembers),
}));