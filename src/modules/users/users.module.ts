import type { IUserRepository } from "./repositories/user.repository";
import { UserRepositoryImpl } from "./repositories/impl/user.repository.impl";
import { UserService } from "./services/user.service";
import { UserController } from "./controllers/user.controller";

type UsersModuleOptions = {
    repository?: IUserRepository;
    service?: UserService;
    controller?: UserController;
};

export class UsersModule {
    public readonly controller: UserController;

    constructor(options: UsersModuleOptions = {}) {
        const repository = options.repository ?? new UserRepositoryImpl();
        const service = options.service ?? new UserService(repository);
        this.controller = options.controller ?? new UserController(service);
    }

    get router() {
        return this.controller.router;
    }
}

export const usersModule = new UsersModule();
