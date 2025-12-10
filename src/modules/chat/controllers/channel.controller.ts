import { Hono } from "hono";
import { ChannelService } from "../services/channel.service";
import { auth as authType } from "../../../lib/auth";

type SessionContext = NonNullable<Awaited<ReturnType<typeof authType.api.getSession>>>;

type Variables = {
    session: SessionContext;
};

export class ChannelController {
    public readonly router: Hono<{ Variables: Variables }>;

    constructor(private readonly channelService: ChannelService,
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

        this.router.get("/", authMiddleware, async (c) => {
            try {
                const page = Number(c.req.query("page") || 1);
                const limit = Number(c.req.query("limit") || 10);

                const result = await this.channelService.getAllChannels(page, limit);
                return c.json(result);
            } catch (error) {
                return c.json({ error: "Internal Server Error" }, 500);
            }
        });

        this.router.get("/:id", authMiddleware, async (c) => {
            try {
                const id = c.req.param("id");
                const channel = await this.channelService.getChannelById(id);
                return c.json(channel);
            } catch (error) {
                return c.json({ error: "Internal Server Error" }, 500);
            }
        });

        this.router.post("/", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const data = await c.req.json();
                const channel = await this.channelService.createChannel({
                    ...data,
                    ownerId: session.user.id,
                });
                return c.json(channel);
            } catch (error) {
                return c.json({ error: "Internal Server Error" }, 500);
            }
        });

        this.router.patch("/:id", authMiddleware, async (c) => {
            try {
                const id = c.req.param("id");
                const data = await c.req.json();
                const channel = await this.channelService.updateChannel(id, data);
                if (!channel) {
                    return c.json({ message: "Channel not found" }, 404);
                }
                return c.json(channel);
            } catch (error) {
                return c.json({ error: "Internal Server Error" }, 500);
            }
        });

        this.router.delete("/:id", authMiddleware, async (c) => {
            try {
                const id = c.req.param("id");
                const deleted = await this.channelService.deleteChannel(id);
                if (!deleted) {
                    return c.json({ message: "Channel not found" }, 404);
                }
                return c.json({ message: "Channel deleted" });
            } catch (error) {
                return c.json({ error: "Internal Server Error" }, 500);
            }
        });
    }
}