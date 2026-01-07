import type { UpdateUserDto } from "../dtos/update-user.dto";
import type { User, UserWithProfile } from "../entities";

export interface IUserRepository {
    findAll(): Promise<UserWithProfile[]>;
    findById(id: string): Promise<UserWithProfile | undefined>;
    update(id: string, data: UpdateUserDto): Promise<UserWithProfile | undefined>;
    delete(id: string): Promise<User | undefined>;
}
