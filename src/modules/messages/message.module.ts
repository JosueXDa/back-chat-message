import { MessageController } from "./controllers/message.controller";
import { IMessageRepository } from "./repositories/message.repository";
import { MessageService } from "./services/message.service";

export class MessageModule {
    public readonly controller: MessageController;
    public readonly service: MessageService;
    public readonly repository: IMessageRepository;

    constructor(
        repository: IMessageRepository,
        service: MessageService,
        controller: MessageController
    ) {
        this.repository = repository;
        this.service = service;
        this.controller = controller;
    }

    get router() {
        return this.controller.router;
    }
}
