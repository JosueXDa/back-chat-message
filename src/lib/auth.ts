import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import { users } from "../db/schema/users.entity";
import { accounts } from "../db/schema/accounts.entity";
import { sessions } from "../db/schema/sessions.entity";
import { verifications } from "../db/schema/verifications.entity";
import { profile } from "../db/schema/profile.entity";

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
    user: {
        additionalFields: {
            role: {
                type: "string",
                defaultValue: "user",
            },
        },
    },

    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    const displayName = user.name || user.email;

                    await db
                        .insert(profile)
                        .values({
                            userId: user.id,
                            displayName,
                            avatarUrl: user.image ?? null,
                            bio: null,
                            age: null,
                            isOnline: false,
                        })
                        .onConflictDoNothing({ target: profile.userId });
                },
            },
        },
    },
    plugins: [
        expo(),
    ],

    trustedOrigins: [
        'http://localhost:3000',
        'http://192.168.18.8:8081',
        'http://localhost:8081',
        'http://192.168.18.189:8081',
        ...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : []),
        ...(process.env.TRUSTED_ORIGINS ? process.env.TRUSTED_ORIGINS.split(',').map(o => o.trim()) : []),
    ],

    advanced: {
        defaultCookieAttributes: {
            // En producción (Cloudflare Workers, siempre HTTPS) se necesita SameSite=None; Secure
            // para que el navegador envíe la cookie en peticiones XHR cross-origin.
            secure: process.env.DEPLOYMENT === 'production',
            httpOnly: true,
            sameSite: process.env.DEPLOYMENT === 'production' ? 'none' : 'lax',
        },
    },

    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8
    },

    socialProviders: {
        github: {
            enabled: true,
            clientId: process.env.GITHUB_CLIENT_ID as string,
            clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        },
        google: {
            enabled: true,
            prompt: 'select_account',
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
    },
});