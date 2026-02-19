import { createMiddleware } from 'hono/factory';
import { auth } from '../lib/auth'; // Ensure this path is correct
import { Context, Next } from 'hono';

export type AuthVariables = {
    user: typeof auth.$Infer.Session.user;
    session: typeof auth.$Infer.Session.session;
};

export const sessionMiddleware = createMiddleware(async (c: Context, next: Next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
        c.set("user", null);
        c.set("session", null);
        return next();
    }
    c.set("user", session.user);
    c.set("session", session.session);
    return next();
});

export const requireAuth = createMiddleware(async (c: Context, next: Next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
        return c.json({ message: "Unauthorized" }, 401);
    }
    c.set("user", session.user);
    c.set("session", session.session);
    return next();
});

export const requireRole = (role: string) => {
    return createMiddleware(async (c: Context, next: Next) => {
        const session = await auth.api.getSession({ headers: c.req.raw.headers });

        if (!session) {
            return c.json({ message: "Unauthorized" }, 401);
        }

        // cast to any because better-auth types might not have picked up the custom field yet without restarting ts server?
        // or we can define a type for our user
        const userRole = (session.user as any).role;

        if (userRole !== role) {
            return c.json({ message: "Forbidden" }, 403);
        }

        c.set("user", session.user);
        c.set("session", session.session);
        return next();
    });
};
