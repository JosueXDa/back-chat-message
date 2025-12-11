import { Hono } from "hono";
import { MessageService } from "../services/message.service";
import { auth as authType } from "../../../lib/auth";

type SessionContext = NonNullable<Awaited<ReturnType<typeof authType.api.getSession>>>;

type Variables = {
    session: SessionContext;
};

export class MessageController {
    public readonly router: Hono<{ Variables: Variables }>;

    constructor(private readonly messageService: MessageService,
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

        this.router.get("/:channelId", authMiddleware, async (c) => {
            try {
                const channelId = c.req.param("channelId");
                const messages = await this.messageService.getMessagesByChannel(channelId);
                return c.json(messages);
            } catch (error) {
                return c.json({ error: "Internal Server Error" }, 500);
            }
        });

        this.router.post("/", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const data = await c.req.json();
                const message = await this.messageService.createMessage({
                    ...data,
                    senderId: session.user.id,
                });
                return c.json(message, 201);
            } catch (error) {
                return c.json({ error: "Internal Server Error" }, 500);
            }
        });
    }
}
