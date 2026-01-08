import { Hono } from "hono";
import { ChatGateway } from "../gateway/chat.gateway";
import { toHTTPException } from "../errors/chat.errors";

export class DebugController {
    public readonly router = new Hono();

    constructor(private readonly chatGateway: ChatGateway) {
        this.setupRoutes();
    }

    private setupRoutes() {
        /**
         * GET /debug/gateway-state
         * Endpoint de depuración para ver el estado interno del gateway
         */
        this.router.get("/gateway-state", async (c) => {
            try {
                const debugInfo = this.chatGateway.getDebugInfo();
                return c.json({
                    success: true,
                    data: debugInfo,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                throw toHTTPException(error);
            }
        });
    }
}
