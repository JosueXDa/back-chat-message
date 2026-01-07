import { Hono } from "hono";
import { updateUserSchema } from "../dtos/update-user.dto";
import { UserService } from "../services/user.service";
import { UserNotFoundError, UserValidationError, ProfileCreationError, UserRepositoryError } from "../errors/user.errors";
import { ZodError } from "zod";
import { authMiddleware, type AuthVariables } from "../../../middlewares/auth.middleware";

export class UserController {
    public readonly router: Hono<{ Variables: AuthVariables }>;

    constructor(
        private readonly userService: UserService
    ) {
        this.router = new Hono<{ Variables: AuthVariables }>();
        this.registerRoutes();
    }

    private registerRoutes() {

        this.router.get("/", authMiddleware, async (c) => {
            try {
                const users = await this.userService.getUsers();
                return c.json(users);
            } catch (error) {
                return this.handleError(c, error);
            }
        });

        this.router.get("/:id", authMiddleware, async (c) => {
            try {
                const id = c.req.param("id");
                const user = await this.userService.getUserById(id);
                return c.json(user);
            } catch (error) {
                return this.handleError(c, error);
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

                return c.json(updated);
            } catch (error) {
                return this.handleError(c, error);
            }
        });

        this.router.delete("/:id", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const id = c.req.param("id");

                if (session.user.id !== id) {
                    return c.json({ error: "Forbidden: You can only delete your own account" }, 403);
                }

                await this.userService.deleteUser(id);
                return c.json({ message: "User deleted" });
            } catch (error) {
                return this.handleError(c, error);
            }
        });
    }

    private handleError(c: any, error: unknown) {
        if (error instanceof UserNotFoundError) {
            return c.json({ error: error.message }, 404);
        }

        if (error instanceof ProfileCreationError) {
            return c.json({ error: error.message }, 400);
        }

        if (error instanceof ZodError) {
            return c.json({ 
                error: "Validation error", 
                details: error.issues 
            }, 400);
        }

        if (error instanceof UserRepositoryError) {
            console.error("Repository error:", error.cause);
            return c.json({ error: "Database operation failed" }, 500);
        }

        console.error("Unexpected error:", error);
        return c.json({ error: "Internal Server Error" }, 500);
    }
}
