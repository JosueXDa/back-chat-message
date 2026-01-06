import { Hono } from "hono";
import { updateUserSchema } from "../dtos/update-user.dto";
import { UserService } from "../services/user.service";
import { auth as authType } from "../../../lib/auth";

type SessionContext = NonNullable<Awaited<ReturnType<typeof authType.api.getSession>>>;

type Variables = {
    session: SessionContext;
};

export class UserController {
    public readonly router: Hono<{ Variables: Variables }>;

    constructor(
        private readonly userService: UserService,
        private readonly auth: typeof authType
    ) {
        this.router = new Hono<{ Variables: Variables }>();
        this.registerRoutes();
    }

    private registerRoutes() {
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

        this.router.get("/", authMiddleware, async (c) => {
            try {
                const users = await this.userService.getUsers();
                return c.json(users);
            } catch (error: any) {
                console.error("Error fetching users:", error);
                return c.json({ error: "Internal Server Error" }, 500);
            }
        });

        this.router.get("/:id", authMiddleware, async (c) => {
            try {
                const id = c.req.param("id");
                const user = await this.userService.getUserById(id);

                if (!user) {
                    return c.json({ message: "User not found" }, 404);
                }

                return c.json(user);
            } catch (error: any) {
                console.error("Error fetching user:", error);
                return c.json({ error: "Internal Server Error" }, 500);
            }
        });

        this.router.patch("/:id", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const id = c.req.param("id");

                if (session.user.id !== id) {
                    return c.json({ error: "Forbidden: You can only update your own profile" }, 403);
                }

                const body = await c.req.json();
                const validatedData = updateUserSchema.parse(body);

                const updated = await this.userService.updateUser(id, validatedData);

                if (!updated) {
                    return c.json({ message: "User not found" }, 404);
                }

                return c.json(updated);
            } catch (error: any) {
                console.error("Error updating user:", error);
                if (error.name === "ZodError") {
                    return c.json({ error: "Validation error", details: error.errors }, 400);
                }
                return c.json({ error: "Internal Server Error" }, 500);
            }
        });

        this.router.delete("/:id", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const id = c.req.param("id");

                if (session.user.id !== id) {
                    return c.json({ error: "Forbidden: You can only delete your own account" }, 403);
                }

                const deleted = await this.userService.deleteUser(id);

                if (!deleted) {
                    return c.json({ message: "User not found" }, 404);
                }

                return c.json({ message: "User deleted" });
            } catch (error: any) {
                console.error("Error deleting user:", error);
                return c.json({ error: "Internal Server Error" }, 500);
            }
        });
    }
}
