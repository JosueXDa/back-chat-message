import { Hono } from "hono";
import { MessageService } from "../services/message.service";
import { createMessageDto } from "../dtos/create-message.dto";
import { requireAuth, type AuthVariables } from "../../../middlewares/auth.middleware";
import { toHTTPException } from "../../member-access/errors/access.errors";
import { Env } from "../../../durable-objects/types";

export class MessageController {
    public readonly router: Hono<{ Variables: AuthVariables, Bindings: Env }>;

    constructor(private readonly messageService: MessageService
    ) {
        this.router = new Hono<{ Variables: AuthVariables, Bindings: Env }>();
        this.registerRoutes();
    }

    private registerRoutes() {
        this.router.get("/thread/:threadId", requireAuth, async (c) => {
            try {
                const user = c.get("user");
                const threadId = c.req.param("threadId");
                const limit = Number(c.req.query("limit") || 50);
                const offset = Number(c.req.query("offset") || 0);

                const messages = await this.messageService.getMessagesByThread(
                    threadId,
                    user.id,
                    limit,
                    offset
                );

                return c.json(messages);
            } catch (error) {
                throw toHTTPException(error);
            }
        });


        this.router.post("/", requireAuth, async (c) => {
            try {
                const user = c.get("user");
                const data = await c.req.json();

                // Validar DTO
                const validatedData = createMessageDto.parse({
                    ...data,
                    senderId: user.id,
                });

                // Crear el mensaje
                const message = await this.messageService.createMessage(validatedData, c.env.ChatThread);

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
        this.router.delete("/:id", requireAuth, async (c) => {
            try {
                const user = c.get("user");
                const id = c.req.param("id");

                await this.messageService.deleteMessage(id, user.id, c.env.ChatThread);

                return c.json({ message: "Message deleted successfully" });
            } catch (error) {
                throw toHTTPException(error);
            }
        });
    }
}
