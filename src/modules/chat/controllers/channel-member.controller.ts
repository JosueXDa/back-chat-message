import { ChannelMemberService } from "../services/channel-member.service";
import { Hono } from "hono";
import { createMemberChannelDto } from "../dtos/create-member-cahnnel.dto";
import { updateMemberRoleDto } from "../dtos/update-member-role.dto";
import { authMiddleware, type AuthVariables } from "@/middlewares/auth.middleware";
import { toHTTPException } from "../errors/chat.errors";

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
                throw toHTTPException(error);
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
            } catch (error) {
                throw toHTTPException(error);
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
                
                return c.json({ role });
            } catch (error) {
                throw toHTTPException(error);
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
            } catch (error) {
                throw toHTTPException(error);
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
            } catch (error) {
                throw toHTTPException(error);
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
                
                await this.channelMemberService.deleteMember(
                    channelId,
                    userId,
                    session.user.id
                );
                
                return c.json({ message: "Member removed successfully" });
            } catch (error) {
                throw toHTTPException(error);
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
                throw toHTTPException(error);
            }
        });
    }
}