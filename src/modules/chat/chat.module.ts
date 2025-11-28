import { ChannelRepository } from "./repositories/channel.repository";
import { ChannelService } from "./services/channel.service";
import { ChannelController } from "./controllers/channel.controller";

type ChatModuleOptions = {
    repository?: ChannelRepository;
    service?: ChannelService;
    controller?: ChannelController;
}

export class ChatModule {
    public readonly controller: ChannelController;

    constructor(options: ChatModuleOptions = {}) {
        const repository = options.repository ?? new ChannelRepository();
        const service = options.service ?? new ChannelService(repository);
        this.controller = options.controller ?? new ChannelController(service);
    }

    get router() {
        return this.controller.router;
    }
}

export const chatModule = new ChatModule();
