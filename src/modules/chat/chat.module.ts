import { ChannelRepository } from "./repositories/channel.repository";
import { ChannelService } from "./services/channel.service";
import { ChannelController } from "./controllers/channel.controller";
import { auth } from "../../lib/auth";

type ChatModuleOptions = {
    repository?: ChannelRepository;
    service?: ChannelService;
    controller?: ChannelController;
    auth?: typeof auth;
}

export class ChatModule {
    public readonly controller: ChannelController;

    constructor(options: ChatModuleOptions = {}) {
        const repository = options.repository ?? new ChannelRepository();
        const service = options.service ?? new ChannelService(repository);
        const injectedAuth = options.auth ?? auth; // usar el inyectado o el default
        this.controller = options.controller ?? new ChannelController(service, injectedAuth);
    }

    get router() {
        return this.controller.router;
    }
}

export const chatModule = new ChatModule();
