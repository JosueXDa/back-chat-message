import { Hono } from "hono";
import { ChannelService } from "../services/channel.service";
import { createChannelSchema } from "../dtos/create-channel.dto";
import { updateChannelSchema } from "../dtos/update-channel.dto";
import { requireAuth, type AuthVariables } from "../../../middlewares/auth.middleware";
import { toHTTPException } from "../../member-access/errors/access.errors";

export class ChannelController {
    public readonly router: Hono<{ Variables: AuthVariables }>;

    constructor(private readonly channelService: ChannelService
    ) {
        this.router = new Hono<{ Variables: AuthVariables }>();
        this.registerRoutes();
    }

    private registerRoutes() {

        this.router.get("/", requireAuth, async (c) => {
            try {
                const page = Number(c.req.query("page") || 1);
                const limit = Number(c.req.query("limit") || 10);

                const result = await this.channelService.getAllChannels(page, limit);
                return c.json(result);
            } catch (error) {
                throw toHTTPException(error);
            }
        });

        this.router.get("/:id", requireAuth, async (c) => {
            try {
                const id = c.req.param("id");
                const channel = await this.channelService.getChannelById(id);
                return c.json(channel);
            } catch (error) {
                throw toHTTPException(error);
            }
        });

        this.router.post("/", requireAuth, async (c) => {
            try {
                const user = c.get("user");
                const body = await c.req.json();

                // Validar con Zod
                const validatedData = createChannelSchema.parse(body);

                // Agregar el ownerId del usuario autenticado
                const data = {
                    ...validatedData,
                    ownerId: user.id,
                };

                const channel = await this.channelService.createChannel(data);
                return c.json(channel);
            } catch (error) {
                throw toHTTPException(error);
            }
        });

        this.router.patch("/:id", requireAuth, async (c) => {
            try {
                const id = c.req.param("id");
                const body = await c.req.json();

                // Validar con Zod
                const data = updateChannelSchema.parse(body);

                const channel = await this.channelService.updateChannel(id, data);
                return c.json(channel);
            } catch (error) {
                throw toHTTPException(error);
            }
        });

        this.router.delete("/:id", requireAuth, async (c) => {
            try {
                const id = c.req.param("id");
                await this.channelService.deleteChannel(id);
                return c.json({ message: "Channel deleted" });
            } catch (error) {
                throw toHTTPException(error);
            }
        });
    }
}