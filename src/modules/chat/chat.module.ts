import { Hono } from "hono";
import { ChannelRepository } from "./repositories/channel.repository";
import { ChannelService } from "./services/channel.service";
import { ChannelController } from "./controllers/channel.controller";
import { ChannelMemberService } from "./services/channel-member.service";
import { ChannelMemberController } from "./controllers/channel-member.controller";
import { ChannelMemberRepository } from "./repositories/channel-member.repository";

import { auth } from "../../lib/auth";

type ChatModuleOptions = {
    repository?: ChannelRepository;
    service?: ChannelService;
    controller?: ChannelController;
    repositoryMember?: ChannelMemberRepository;
    serviceMember?: ChannelMemberService;
    controllerMember?: ChannelMemberController;
    auth?: typeof auth;
}

export class ChatModule {
    public readonly controller: ChannelController;
    public readonly controllerMember: ChannelMemberController;

    constructor(options: ChatModuleOptions = {}) {
        const injectedAuth = options.auth ?? auth; // usar el inyectado o el default

        const repository = options.repository ?? new ChannelRepository();
        const service = options.service ?? new ChannelService(repository);
        this.controller = options.controller ?? new ChannelController(service, injectedAuth);

        const repositoryMember = options.repositoryMember ?? new ChannelMemberRepository();
        const serviceMember = options.serviceMember ?? new ChannelMemberService(repositoryMember);
        this.controllerMember = options.controllerMember ?? new ChannelMemberController(serviceMember, injectedAuth);
    }

    get router() {
        const app = new Hono();
        app.route("/channels", this.controller.router);
        app.route("/members", this.controllerMember.router);
        return app;
    }
}

export const chatModule = new ChatModule();
