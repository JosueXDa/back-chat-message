import { Hono } from "hono";
import { auth } from "../../lib/auth";
import { UploadController } from "./controllers/upload.controller";

export class UploadModule {
    public readonly router: Hono;

    constructor() {
        this.router = new Hono();
        this.registerRoutes();
    }

    private registerRoutes() {
        const uploadController = new UploadController(auth);
        
        // Monta todas las rutas de upload bajo /uploads
        this.router.route("/uploads", uploadController.router);
    }
}

export const uploadModule = new UploadModule();
