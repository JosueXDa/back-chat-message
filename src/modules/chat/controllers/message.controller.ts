import { Hono } from "hono";
import { MessageService } from "../services/message.service";
import { auth as authType } from "../../../lib/auth";
import { createMessageDto } from "../dtos/create-message.dto";

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

        /**
         * GET /messages/thread/:threadId
         * Obtiene mensajes de un thread específico
         */
        this.router.get("/thread/:threadId", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const threadId = c.req.param("threadId");
                const limit = Number(c.req.query("limit") || 50);
                const offset = Number(c.req.query("offset") || 0);
                
                const messages = await this.messageService.getMessagesByThread(
                    threadId,
                    session.user.id,
                    limit,
                    offset
                );
                
                return c.json(messages);
            } catch (error: any) {
                console.error("Error fetching messages:", error);
                return c.json({ error: error.message || "Internal Server Error" }, error.message ? 403 : 500);
            }
        });

        /**
         * POST /api/messages
         * 
         * Crea un nuevo mensaje y lo guarda en la BD.
         * 
         * Request:
         * {
         *   "threadId": "uuid",
         *   "content": "Hello world"
         * }
         * 
         * Response (201 Created):
         * {
         *   "id": "msg-id-from-server",
         *   "content": "Hello world",
         *   "senderId": "user-id",
         *   "threadId": "uuid",
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

                // Validar DTO
                const validatedData = createMessageDto.parse({
                    ...data,
                    senderId: session.user.id,
                });

                // Crear el mensaje
                const message = await this.messageService.createMessage(validatedData);

                // Retornar el ID real del servidor inmediatamente
                // El cliente lo usará para reemplazar su mensaje temporal
                console.log(`✅ [API] Message created: ${message.id} in thread ${message.threadId}`);
                
                return c.json(message, 201);
            } catch (error: any) {
                console.error("Error creating message:", error);
                if (error.name === "ZodError") {
                    return c.json({ error: "Invalid request data", details: error.errors }, 400);
                }
                return c.json({ error: error.message || "Internal Server Error" }, error.message ? 403 : 500);
            }
        });

        /**
         * DELETE /messages/:id
         * Elimina un mensaje (autor o moderator/admin)
         */
        this.router.delete("/:id", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const id = c.req.param("id");
                
                await this.messageService.deleteMessage(id, session.user.id);
                
                return c.json({ message: "Message deleted successfully" });
            } catch (error: any) {
                console.error("Error deleting message:", error);
                const status = error.message === "Message not found" ? 404 : 
                              error.message ? 403 : 500;
                return c.json({ error: error.message || "Internal Server Error" }, status);
            }
        });
    }
}
