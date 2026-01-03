import { UserRepository } from "./repositories/user.repository";
import { UserService } from "./services/user.service";
import { UserController } from "./controllers/user.controller";
import { auth } from "../../lib/auth";

type UsersModuleOptions = {
    repository?: UserRepository;
    service?: UserService;
    controller?: UserController;
};

export class UsersModule {
    public readonly controller: UserController;

    constructor(options: UsersModuleOptions = {}) {
        const repository = options.repository ?? new UserRepository();
        const service = options.service ?? new UserService(repository);
        this.controller = options.controller ?? new UserController(service, auth);
    }

    get router() {
        return this.controller.router;
    }
}

export const usersModule = new UsersModule();
