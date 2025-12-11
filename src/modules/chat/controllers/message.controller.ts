import { Hono } from "hono";
import { MessageService } from "../services/message.service";
import { auth as authType } from "../../../lib/auth";

type SessionContext = NonNullable<Awaited<ReturnType<typeof authType.api.getSession>>>;

type Variables = {
    session: SessionContext;
};

/**
 * MessageController
 * 
 * Implementa Server-Driven State Synchronization:
 * 
 * POST /api/messages:
 * 1. Valida la request
 * 2. Guarda el mensaje en la BD
 * 3. Retorna el ID real del servidor INMEDIATAMENTE (200 OK)
 * 4. El MessageService emite un evento que el Gateway broadcast por WebSocket
 * 5. El cliente recibe la confirmación por WebSocket y reemplaza temp -> real
 * 
 * De esta forma:
 * - El cliente tiene el ID real inmediatamente para evitar confusión
 * - WebSocket es la confirmación definitiva de que se guardó en la BD
 * - El servidor es la única fuente de verdad
 */
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
                console.error("Error fetching messages:", error);
                return c.json({ error: "Internal Server Error" }, 500);
            }
        });

        /**
         * POST /api/messages
         * 
         * Crea un nuevo mensaje y lo guarda en la BD.
         * 
         * Request:
         * {
         *   "channelId": "uuid",
         *   "content": "Hello world"
         * }
         * 
         * Response (201 Created):
         * {
         *   "id": "msg-id-from-server",
         *   "content": "Hello world",
         *   "senderId": "user-id",
         *   "channelId": "uuid",
         *   "createdAt": "2024-01-01T00:00:00Z"
         * }
         * 
         * Nota: El cliente recibe el ID real inmediatamente.
         * WebSocket enviará la confirmación definitiva poco después.
         */
        this.router.post("/", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const data = await c.req.json();

                // Validar que channelId esté presente
                if (!data.channelId) {
                    return c.json({ error: "channelId is required" }, 400);
                }

                // Crear el mensaje
                const message = await this.messageService.createMessage({
                    ...data,
                    senderId: session.user.id,
                });

                // Retornar el ID real del servidor inmediatamente
                // El cliente lo usará para reemplazar su mensaje temporal
                console.log(`✅ [API] Message created: ${message.id} in channel ${message.channelId}`);
                
                return c.json(message, 201);
            } catch (error) {
                console.error("Error creating message:", error);
                return c.json({ error: "Internal Server Error" }, 500);
            }
        });
    }
}
