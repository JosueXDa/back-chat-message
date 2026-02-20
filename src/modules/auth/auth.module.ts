import { Hono } from 'hono';
import { AuthController } from './auth.controller';

export class AuthModule {
    public router: Hono;
    private authController: AuthController;

    constructor() {
        this.router = new Hono();
        this.authController = new AuthController();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.all('/*', (c) => this.authController.handle(c));
        this.router.on(["POST", "GET"], "/*", (c) => this.authController.handle(c));
    }
}
