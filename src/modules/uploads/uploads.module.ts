import { Hono } from "hono";
import { UploadController } from "./controllers/upload.controller";
import { UploadService } from "./services/upload.service";

type UploadModuleOptions = {
    service?: UploadService;
    controller?: UploadController;
};

export class UploadModule {
    public readonly controller: UploadController;

    constructor(options: UploadModuleOptions = {}) {
        const service = options.service ?? new UploadService();
        this.controller = options.controller ?? new UploadController(service);
    }

    get router() {
        const app = new Hono();
        app.route("/uploads", this.controller.router);
        return app;
    }
}

export const uploadModule = new UploadModule();
