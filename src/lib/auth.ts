import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import { users } from "../db/schema/users.entity";
import { accounts } from "../db/schema/accounts.entity";
import { sessions } from "../db/schema/sessions.entity";
import { verifications } from "../db/schema/verifications.entity";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            user: users,
            account: accounts,
            session: sessions,
            verification: verifications,
        },
    }),

    trustedOrigins: ['http://localhost:3000'],

    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
    },
});