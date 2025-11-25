import { Hono } from "hono";
import { createUserSchema } from "../dtos/create-user.dto";
import { updateUserSchema } from "../dtos/update-user.dto";
import { UserService } from "../services/user.service";

export class UserController {
    public readonly router: Hono;

    constructor(private readonly userService: UserService) {
        this.router = new Hono();
        this.registerRoutes();
    }

    private registerRoutes() {
        this.router.get("/", async (c) => {
            const users = await this.userService.getUsers();
            return c.json(users);
        });

        this.router.get("/:id", async (c) => {
            const id = c.req.param("id");
            const user = await this.userService.getUserById(id);

            if (!user) {
                return c.json({ message: "User not found" }, 404);
            }

            return c.json(user);
        });

        this.router.post("/", async (c) => {
            let rawBody: unknown;
            try {
                rawBody = await c.req.json();
            } catch {
                return c.json({ message: "Invalid JSON body" }, 400);
            }

            const parsed = createUserSchema.safeParse(rawBody);
            if (!parsed.success) {
                return c.json({
                    message: "Validation failed",
                    errors: parsed.error.flatten(),
                }, 400);
            }

            const user = await this.userService.createUser(parsed.data);
            return c.json(user, 201);
        });

        this.router.patch("/:id", async (c) => {
            const id = c.req.param("id");

            let rawBody: unknown;
            try {
                rawBody = await c.req.json();
            } catch {
                return c.json({ message: "Invalid JSON body" }, 400);
            }

            const parsed = updateUserSchema.safeParse(rawBody);
            if (!parsed.success) {
                return c.json({
                    message: "Validation failed",
                    errors: parsed.error.flatten(),
                }, 400);
            }

            const updated = await this.userService.updateUser(id, parsed.data);

            if (!updated) {
                return c.json({ message: "User not found" }, 404);
            }

            return c.json(updated);
        });

        this.router.delete("/:id", async (c) => {
            const id = c.req.param("id");
            const deleted = await this.userService.deleteUser(id);

            if (!deleted) {
                return c.json({ message: "User not found" }, 404);
            }

            return c.json({ message: "User deleted" });
        });
    }
}
