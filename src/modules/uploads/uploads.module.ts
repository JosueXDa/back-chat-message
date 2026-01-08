import { Hono } from "hono";
import { UploadController } from "./controllers/upload.controller";
import { IUploadsService } from "./services/upload.service";
import { UploadServiceImpl } from "./services/impl/uploads.service.impl";

type UploadModuleOptions = {
    service?: IUploadsService;
    controller?: UploadController;
};

export class UploadModule {
    public readonly controller: UploadController;

    constructor(options: UploadModuleOptions = {}) {
        const service = options.service ?? new UploadServiceImpl();
        this.controller = options.controller ?? new UploadController(service);
    }

    get router() {
        const app = new Hono();
        app.route("/uploads", this.controller.router);
        return app;
    }
}

export const uploadModule = new UploadModule();
