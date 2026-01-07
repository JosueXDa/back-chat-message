import { Hono } from "hono";
import { ChannelRepository } from "./repositories/channel.repository";
import { ChannelService } from "./services/channel.service";
import { ChannelController } from "./controllers/channel.controller";
import { ChannelMemberService } from "./services/channel-member.service";
import { ChannelMemberController } from "./controllers/channel-member.controller";
import { ChannelMemberRepository } from "./repositories/channel-member.repository";
import { MessageRepository } from "./repositories/message.repository";
import { MessageService } from "./services/message.service";
import { MessageController } from "./controllers/message.controller";
import { MessageEventEmitter } from "./services/message-event.emitter";
import { ThreadRepository } from "./repositories/thread.repository";
import { ThreadService } from "./services/thread.service";
import { ThreadController } from "./controllers/thread.controller";
import { AuthorizationService } from "./services/authorization.service";

type ChatModuleOptions = {
    repository?: ChannelRepository;
    service?: ChannelService;
    controller?: ChannelController;
    repositoryMember?: ChannelMemberRepository;
    serviceMember?: ChannelMemberService;
    controllerMember?: ChannelMemberController;
    repositoryMessage?: MessageRepository;
    serviceMessage?: MessageService;
    controllerMessage?: MessageController;
    repositoryThread?: ThreadRepository;
    serviceThread?: ThreadService;
    controllerThread?: ThreadController;
    messageEventEmitter?: MessageEventEmitter;
    authorizationService?: AuthorizationService;
}

export class ChatModule {
    public readonly controller: ChannelController;
    public readonly controllerMember: ChannelMemberController;
    public readonly controllerMessage: MessageController;
    public readonly controllerThread: ThreadController;
    public readonly messageEventEmitter: MessageEventEmitter;
    public readonly threadService: ThreadService;

    constructor(options: ChatModuleOptions = {}) {
        const repository = options.repository ?? new ChannelRepository();
        const service = options.service ?? new ChannelService(repository);
        this.controller = options.controller ?? new ChannelController(service);

        const repositoryMember = options.repositoryMember ?? new ChannelMemberRepository();
        const serviceMember = options.serviceMember ?? new ChannelMemberService(repositoryMember);
        this.controllerMember = options.controllerMember ?? new ChannelMemberController(serviceMember);

        const authorizationService = options.authorizationService ?? new AuthorizationService(repositoryMember);

        const repositoryThread = options.repositoryThread ?? new ThreadRepository();
        this.threadService = options.serviceThread ?? new ThreadService(repositoryThread, authorizationService);
        this.controllerThread = options.controllerThread ?? new ThreadController(this.threadService);

        this.messageEventEmitter = options.messageEventEmitter ?? new MessageEventEmitter();

        const repositoryMessage = options.repositoryMessage ?? new MessageRepository();
        const serviceMessage = options.serviceMessage ?? new MessageService(
            repositoryMessage,
            repositoryThread,
            authorizationService,
            this.messageEventEmitter
        );
        this.controllerMessage = options.controllerMessage ?? new MessageController(serviceMessage);
    }

    get router() {
        const app = new Hono();
        app.route("/channels", this.controller.router);
        app.route("/members", this.controllerMember.router);
        app.route("/messages", this.controllerMessage.router);
        app.route("/threads", this.controllerThread.router);
        return app;
    }
}

export const chatModule = new ChatModule();
