import type { Context, Next } from "hono";
import { auth } from "../lib/auth";

export type SessionContext = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export type AuthVariables = {
    session: SessionContext;
};

export const authMiddleware = async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
    const session = await auth.api.getSession({
        headers: c.req.raw.headers,
    });

    if (!session) {
        return c.json({
            error: "Unauthorized"
        }, 401);
    }

    c.set("session", session);
    await next();
};
