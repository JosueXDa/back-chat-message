import { Hono } from "hono";
import { MessageService } from "../services/message.service";
import { createMessageDto } from "../dtos/create-message.dto";
import { authMiddleware, type AuthVariables } from "../../../middlewares/auth.middleware";
import { toHTTPException } from "../errors/chat.errors";

export class MessageController {
    public readonly router: Hono<{ Variables: AuthVariables }>;

    constructor(private readonly messageService: MessageService
    ) {
        this.router = new Hono<{ Variables: AuthVariables }>();
        this.registerRoutes();
    }

    private registerRoutes() {
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
            } catch (error) {
                throw toHTTPException(error);
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
            } catch (error) {
                throw toHTTPException(error);
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
            } catch (error) {
                throw toHTTPException(error);
            }
        });
    }
}
