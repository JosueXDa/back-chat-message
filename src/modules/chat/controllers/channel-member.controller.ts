import { ChannelMemberService } from "../services/channel-member.service";
import { Hono } from "hono";
import { auth as authType } from "../../../lib/auth";

type SessionContext = NonNullable<Awaited<ReturnType<typeof authType.api.getSession>>>;

type Variables = {
    session: SessionContext;
};

export class ChannelMemberController {
    public readonly router: Hono<{ Variables: Variables }>;

    constructor(private readonly channelMemberService: ChannelMemberService,
        private readonly auth: typeof authType
    ) {
        this.router = new Hono<{ Variables: Variables }>();
        this.registerRoutes();
    }

    private registerRoutes() {
        // middleware de autenticacion
        const authMiddleware = async (c: any, next: any) => {
            const session = await this.auth.api.getSession({
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

        this.router.get("/joined", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const channels = await this.channelMemberService.getChannelsByUserId(session.user.id);
                return c.json(channels);
            } catch (error) {
                return c.json({ error: "Internal Server Error" }, 500);
            }
        });

        this.router.get("/:id", authMiddleware, async (c) => {
            try {
                const members = await this.channelMemberService.getMembersByChannelId(c.req.param("id"));
                return c.json(members);
            } catch (error) {
                return c.json({ error: "Internal Server Error" }, 500);
            }
        });

        this.router.post("/", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const data = await c.req.json();
                const member = await this.channelMemberService.createMember({
                    ...data,
                    userId: session.user.id,
                });
                return c.json(member);
            } catch (error) {
                return c.json({ error: "Internal Server Error" }, 500);
            }
        });

        this.router.delete("/:id", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const channelId = c.req.param("id");
                const deleted = await this.channelMemberService.deleteMember(channelId, session.user.id);
                if (!deleted) {
                    return c.json({ message: "Member not found" }, 404);
                }
                return c.json({ message: "Member deleted" });
            } catch (error) {
                return c.json({ error: "Internal Server Error" }, 500);
            }
        });

        this.router.get("/is-joined/:channelId", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const channelId = c.req.param("channelId");
                const isJoined = await this.channelMemberService.isJoined(channelId, session.user.id);
                return c.json({ isJoined });
            } catch (error) {
                return c.json({ error: "Internal Server Error" }, 500);
            }
        });
    }
}