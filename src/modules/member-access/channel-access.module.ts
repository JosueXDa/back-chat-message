import { ChannelMemberController } from "./controllers/channel-member.controller";
import { IChannelMemberRepository } from "./repositories/channel-member.repository";
import { ChannelMemberService } from "./services/channel-member.service";

export class MemberAccessModule {
    public readonly controller: ChannelMemberController;
    public readonly service: ChannelMemberService;
    public readonly repository: IChannelMemberRepository;

    constructor(
        repository: IChannelMemberRepository,
        service: ChannelMemberService,
        controller: ChannelMemberController
    ) {
        this.repository = repository;
        this.service = service;
        this.controller = controller;
    }

    get router() {
        return this.controller.router;
    }
}
