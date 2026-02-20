import type { IUserRepository } from "./repositories/user.repository";
import { UserRepositoryImpl } from "./repositories/impl/user.repository.impl";
import { UserService } from "./services/user.service";
import { UserController } from "./controllers/user.controller";

export class UsersModule {
    public readonly controller: UserController;
    public readonly service: UserService;
    public readonly repository: IUserRepository;

    constructor(
        repository: IUserRepository,
        service: UserService,
        controller: UserController
    ) {
        this.repository = repository;
        this.service = service;
        this.controller = controller;
    }

    get router() {
        return this.controller.router;
    }
}

