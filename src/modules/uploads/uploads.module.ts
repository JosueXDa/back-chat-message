import { Hono } from "hono";
import { auth } from "../../lib/auth";
import { UploadController } from "./controllers/upload.controller";
import { UploadService } from "./services/upload.service";

type UploadModuleOptions = {
    service?: UploadService;
    controller?: UploadController;
    auth?: typeof auth;
};

export class UploadModule {
    public readonly controller: UploadController;

    constructor(options: UploadModuleOptions = {}) {
        const injectedAuth = options.auth ?? auth;
        const service = options.service ?? new UploadService();
        this.controller = options.controller ?? new UploadController(service, injectedAuth);
    }

    get router() {
        const app = new Hono();
        app.route("/uploads", this.controller.router);
        return app;
    }
}

export const uploadModule = new UploadModule();
