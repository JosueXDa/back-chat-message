import { ChannelMemberService } from "../services/channel-member.service";
import { Hono } from "hono";
import { createMemberChannelDto } from "../dtos/create-member-cahnnel.dto";
import { updateMemberRoleDto } from "../dtos/update-member-role.dto";
import { authMiddleware, type AuthVariables } from "@/middlewares/auth.middleware";

export class ChannelMemberController {
    public readonly router: Hono<{ Variables: AuthVariables }>;

    constructor(private readonly channelMemberService: ChannelMemberService
    ) {
        this.router = new Hono<{ Variables: AuthVariables }>();
        this.registerRoutes();
    }

    private registerRoutes() {
        this.router.get("/joined", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const channels = await this.channelMemberService.getChannelsByUserId(session.user.id);
                return c.json(channels);
            } catch (error) {
                return c.json({ error: "Internal Server Error" }, 500);
            }
        });

        /**
         * GET /members/:channelId
         * Obtiene todos los miembros de un canal
         */
        this.router.get("/:channelId", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const channelId = c.req.param("channelId");
                
                const members = await this.channelMemberService.getMembersByChannelId(
                    channelId,
                    session.user.id
                );
                
                return c.json(members);
            } catch (error: any) {
                return c.json({ error: error.message || "Internal Server Error" }, error.message ? 403 : 500);
            }
        });

        /**
         * GET /members/:channelId/role/:userId
         * Obtiene el rol de un usuario específico en un canal
         */
        this.router.get("/:channelId/role/:userId", authMiddleware, async (c) => {
            try {
                const channelId = c.req.param("channelId");
                const userId = c.req.param("userId");
                
                const role = await this.channelMemberService.getMemberRole(channelId, userId);
                
                if (!role) {
                    return c.json({ error: "Member not found" }, 404);
                }
                
                return c.json({ role });
            } catch (error: any) {
                return c.json({ error: error.message || "Internal Server Error" }, 500);
            }
        });

        /**
         * POST /members
         * Agrega un nuevo miembro a un canal (solo admins)
         * 
         * Body:
         * {
         *   "channelId": "uuid",
         *   "userId": "user-id",
         *   "role": "member" // optional: admin, moderator, member
         * }
         */
        this.router.post("/", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const data = await c.req.json();
                
                // Validar DTO
                const validatedData = createMemberChannelDto.parse({
                    ...data,
                    userId: session.user.id,
                });
                 
                const member = await this.channelMemberService.createMember(
                    validatedData,
                    session.user.id
                );
                
                return c.json(member, 201);
            } catch (error: any) {
                console.error("Error adding member:", error);
                if (error.name === "ZodError") {
                    return c.json({ error: "Invalid request data", details: error.errors }, 400);
                }
                return c.json({ error: error.message || "Internal Server Error" }, error.message ? 403 : 500);
            }
        });

        /**
         * PATCH /members/:channelId/:userId/role
         * Actualiza el rol de un miembro (solo admins)
         * 
         * Body:
         * {
         *   "role": "admin" | "moderator" | "member"
         * }
         */
        this.router.patch("/:channelId/:userId/role", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const channelId = c.req.param("channelId");
                const userId = c.req.param("userId");
                const body = await c.req.json();
                
                // Validar con Zod
                const { role } = updateMemberRoleDto.parse(body);
                
                const updatedMember = await this.channelMemberService.updateMemberRole(
                    channelId,
                    userId,
                    role,
                    session.user.id
                );
                
                return c.json(updatedMember);
            } catch (error: any) {
                console.error("Error updating role:", error);
                if (error.name === "ZodError") {
                    return c.json({ error: "Validation error", details: error.errors }, 400);
                }
                return c.json({ error: error.message || "Internal Server Error" }, error.message ? 403 : 500);
            }
        });

        /**
         * DELETE /members/:channelId/:userId
         * Elimina un miembro del canal
         * - Admins pueden eliminar a cualquiera
         * - Los usuarios pueden eliminarse a sí mismos (salir del canal)
         */
        this.router.delete("/:channelId/:userId", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const channelId = c.req.param("channelId");
                const userId = c.req.param("userId");
                
                const deleted = await this.channelMemberService.deleteMember(
                    channelId,
                    userId,
                    session.user.id
                );
                
                if (!deleted) {
                    return c.json({ message: "Member not found" }, 404);
                }
                
                return c.json({ message: "Member removed successfully" });
            } catch (error: any) {
                console.error("Error removing member:", error);
                return c.json({ error: error.message || "Internal Server Error" }, error.message ? 403 : 500);
            }
        });

        /**
         * GET /members/is-joined/:channelId
         * Verifica si el usuario actual es miembro del canal
         */
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