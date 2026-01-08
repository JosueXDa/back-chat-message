import { Hono } from "hono";
import { IChannelRepository } from "./repositories/channel.repository";
import { ChannelService } from "./services/channel.service";
import { ChannelController } from "./controllers/channel.controller";
import { ChannelMemberService } from "./services/channel-member.service";
import { ChannelMemberController } from "./controllers/channel-member.controller";
import { IChannelMemberRepository } from "./repositories/channel-member.repository";
import { IMessageRepository } from "./repositories/message.repository";
import { MessageService } from "./services/message.service";
import { MessageController } from "./controllers/message.controller";
import { MessageEventEmitter } from "./services/message-event.emitter";
import { IThreadRepository } from "./repositories/thread.repository";
import { ThreadService } from "./services/thread.service";
import { ThreadController } from "./controllers/thread.controller";
import { AuthorizationService } from "./services/authorization.service";
import { ChannelRepositoryImpl } from "./repositories/impl/channel.repository.impl";
import { ChannelMemberRepositoryImpl } from "./repositories/impl/channel-member.repository.impl";
import { ThreadRepositoryImpl } from "./repositories/impl/thread.repository.impl";
import { MessageRepositoryImpl } from "./repositories/impl/message.repository.impl";

type ChatModuleOptions = {
    repository?: IChannelRepository;
    service?: ChannelService;
    controller?: ChannelController;
    repositoryMember?: IChannelMemberRepository;
    serviceMember?: ChannelMemberService;
    controllerMember?: ChannelMemberController;
    repositoryMessage?: IMessageRepository;
    serviceMessage?: MessageService;
    controllerMessage?: MessageController;
    repositoryThread?: IThreadRepository;
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
        const repository = options.repository ?? new ChannelRepositoryImpl();
        const service = options.service ?? new ChannelService(repository);
        this.controller = options.controller ?? new ChannelController(service);

        const repositoryMember = options.repositoryMember ?? new ChannelMemberRepositoryImpl();
        const authorizationService = options.authorizationService ?? new AuthorizationService(repositoryMember);
        
        const serviceMember = options.serviceMember ?? new ChannelMemberService(repositoryMember, authorizationService);
        this.controllerMember = options.controllerMember ?? new ChannelMemberController(serviceMember);

        const repositoryThread = options.repositoryThread ?? new ThreadRepositoryImpl();
        this.threadService = options.serviceThread ?? new ThreadService(repositoryThread, authorizationService);
        this.controllerThread = options.controllerThread ?? new ThreadController(this.threadService);

        this.messageEventEmitter = options.messageEventEmitter ?? new MessageEventEmitter();

        const repositoryMessage = options.repositoryMessage ?? new MessageRepositoryImpl();
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
