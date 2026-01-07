import { Hono } from "hono";
import { updateUserSchema } from "../dtos/update-user.dto";
import { UserService } from "../services/user.service";
import { toHTTPException } from "../errors/user.errors";
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
                throw toHTTPException(error);
            }
        });

        this.router.get("/:id", authMiddleware, async (c) => {
            try {
                const id = c.req.param("id");
                const user = await this.userService.getUserById(id);
                return c.json(user);
            } catch (error) {
                throw toHTTPException(error);
            }
        });

        this.router.patch("/:id", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const id = c.req.param("id");

                const body = await c.req.json();
                const validatedData = updateUserSchema.parse(body);
                const updated = await this.userService.updateUser(id, validatedData, session.user.id);

                return c.json(updated);
            } catch (error) {
                throw toHTTPException(error);
            }
        });

        this.router.delete("/:id", authMiddleware, async (c) => {
            try {
                const session = c.get("session");
                const id = c.req.param("id");

                await this.userService.deleteUser(id, session.user.id);
                return c.json({ message: "User deleted" });
            } catch (error) {
                throw toHTTPException(error);
            }
        });
    }
}
