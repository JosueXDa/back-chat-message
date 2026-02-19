import { Hono } from "hono";
import { UploadController } from "./controllers/upload.controller";
import { IUploadsService } from "./services/upload.service";
import { UploadServiceImpl } from "./services/impl/uploads.service.impl";

export class UploadModule {
    public readonly controller: UploadController;
    public readonly service: IUploadsService;

    constructor(
        service: IUploadsService,
        controller: UploadController
    ) {
        this.service = service;
        this.controller = controller;
    }

    get router() {
        const app = new Hono();
        app.route("/uploads", this.controller.router);
        return app;
    }
}

