import { Hono } from "hono";
import { ThreadService } from "../services/thread.service";
import { createThreadDto } from "../dtos/create-thread.dto";
import { updateThreadDto } from "../dtos/update-thread.dto";
import { authMiddleware, type AuthVariables } from "../../../middlewares/auth.middleware";
import { toHTTPException } from "../errors/chat.errors";

export class ThreadController {
    public readonly router: Hono<{ Variables: AuthVariables }>;

    constructor(
        private readonly threadService: ThreadService
    ) {
        this.router = new Hono<{ Variables: AuthVariables }>();
        this.registerRoutes();
    }

    private registerRoutes() {
        this.router.get("/channel/:channelId", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const channelId = c.req.param("channelId");
                
                const threads = await this.threadService.getThreadsByChannel(
                    channelId,
                    session.user.id
                );
                
                return c.json(threads);
            } catch (error) {
                throw toHTTPException(error);
            }
        });

        /**
         * GET /threads/channel/:channelId/active
         * Obtiene solo los threads activos (no archivados) de un canal
         */
        this.router.get("/channel/:channelId/active", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const channelId = c.req.param("channelId");
                
                const threads = await this.threadService.getActiveThreadsByChannel(
                    channelId,
                    session.user.id
                );
                
                return c.json(threads);
            } catch (error) {
                throw toHTTPException(error);
            }
        });

        /**
         * GET /threads/:id
         * Obtiene un thread específico por ID
         */
        this.router.get("/:id", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const id = c.req.param("id");
                
                const thread = await this.threadService.getThreadById(id, session.user.id);
                
                return c.json(thread);
            } catch (error) {
                throw toHTTPException(error);
            }
        });

        /**
         * POST /threads
         * Crea un nuevo thread en un canal
         * 
         * Body:
         * {
         *   "channelId": "uuid",
         *   "name": "Thread name",
         *   "description": "Optional description"
         * }
         */
        this.router.post("/", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const data = await c.req.json();
                
                // Validar DTO
                const validatedData = createThreadDto.parse({
                    ...data,
                    createdBy: session.user.id,
                });
                
                const thread = await this.threadService.createThread(validatedData);
                
                return c.json(thread, 201);
            } catch (error) {
                throw toHTTPException(error);
            }
        });

        /**
         * PATCH /threads/:id
         * Actualiza un thread existente
         * 
         * Body:
         * {
         *   "name": "New name",
         *   "description": "New description",
         *   "isArchived": false
         * }
         */
        this.router.patch("/:id", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const id = c.req.param("id");
                const data = await c.req.json();
                
                // Validar DTO
                const validatedData = updateThreadDto.parse(data);
                
                const thread = await this.threadService.updateThread(
                    id,
                    session.user.id,
                    validatedData
                );
                
                return c.json(thread);
            } catch (error) {
                throw toHTTPException(error);
            }
        });

        /**
         * DELETE /threads/:id
         * Elimina un thread (solo admins o creador)
         */
        this.router.delete("/:id", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const id = c.req.param("id");
                
                await this.threadService.deleteThread(id, session.user.id);
                
                return c.json({ message: "Thread deleted successfully" });
            } catch (error) {
                throw toHTTPException(error);
            }
        });

        /**
         * POST /threads/:id/archive
         * Archiva un thread (solo admins)
         */
        this.router.post("/:id/archive", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const id = c.req.param("id");
                
                const thread = await this.threadService.archiveThread(id, session.user.id);
                
                return c.json(thread);
            } catch (error) {
                throw toHTTPException(error);
            }
        });

        /**
         * POST /threads/:id/unarchive
         * Desarchiva un thread (solo admins)
         */
        this.router.post("/:id/unarchive", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const id = c.req.param("id");
                
                const thread = await this.threadService.unarchiveThread(id, session.user.id);
                
                return c.json(thread);
            } catch (error) {
                throw toHTTPException(error);
            }
        });
    }
}
