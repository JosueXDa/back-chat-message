import { Hono } from "hono";
import { ChannelService } from "../services/channel.service";

export class ChannelController {
    public readonly router: Hono;

    constructor(private readonly channelService: ChannelService) {
        this.router = new Hono();
        this.registerRoutes();
    }

    private registerRoutes() {
        this.router.get("/", async (c) => {
            const channels = await this.channelService.getAllChannels();
            return c.json(channels);
        });

        this.router.get("/:id", async (c) => {
            const id = c.req.param("id");
            const channel = await this.channelService.getChannelById(id);
            return c.json(channel);
        });

        this.router.post("/", async (c) => {
            const data = await c.req.json();
            const channel = await this.channelService.createChannel(data);
            return c.json(channel);
        });

        this.router.patch("/:id", async (c) => {
            const id = c.req.param("id");
            const data = await c.req.json();
            const channel = await this.channelService.updateChannel(id, data);
            if (!channel) {
                return c.json({ message: "Channel not found" }, 404);
            }
            return c.json(channel);
        });

        this.router.delete("/:id", async (c) => {
            const id = c.req.param("id");
            const deleted = await this.channelService.deleteChannel(id);
            if (!deleted) {
                return c.json({ message: "Channel not found" }, 404);
            }
            return c.json({ message: "Channel deleted" });
        });
    }
}