import { ThreadController } from "./controllers/thread.controller";
import { IThreadRepository } from "./repositories/thread.repository";
import { ThreadService } from "./services/thread.service";

export class ThreadModule {
    public readonly controller: ThreadController;
    public readonly service: ThreadService;
    public readonly repository: IThreadRepository;

    constructor(
        repository: IThreadRepository,
        service: ThreadService,
        controller: ThreadController
    ) {
        this.repository = repository;
        this.service = service;
        this.controller = controller;
    }

    get router() {
        return this.controller.router;
    }
}
