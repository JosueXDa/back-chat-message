import { ChannelController } from "./controllers/channel.controller";
import { IChannelRepository } from "./repository/channel.repository";
import { ChannelService } from "./services/channel.service";

export class ChannelModule {
    public readonly controller: ChannelController;
    public readonly service: ChannelService;
    public readonly repository: IChannelRepository;

    constructor(
        repository: IChannelRepository,
        service: ChannelService,
        controller: ChannelController
    ) {
        this.repository = repository;
        this.service = service;
        this.controller = controller;
    }

    get router() {
        return this.controller.router;
    }
}
