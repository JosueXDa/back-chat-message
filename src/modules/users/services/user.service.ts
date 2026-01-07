import { UpdateUserDto } from "../dtos/update-user.dto";
import type { IUserRepository } from "../repositories/user.repository.interface";
import type { UserWithProfile } from "../entities";
import { UserNotFoundError } from "../errors/user.errors";

export class UserService {
    constructor(private readonly userRepository: IUserRepository) { }

    async getUsers(): Promise<UserWithProfile[]> {
        return await this.userRepository.findAll();
    }

    async getUserById(id: string): Promise<UserWithProfile> {
        const user = await this.userRepository.findById(id);
        
        if (!user) {
            throw new UserNotFoundError(id);
        }
        
        return user;
    }

    async updateUser(id: string, data: UpdateUserDto): Promise<UserWithProfile> {
        const existing = await this.userRepository.findById(id);
        if (!existing) {
            throw new UserNotFoundError(id);
        }

        const updated = await this.userRepository.update(id, data);
        
        if (!updated) {
            throw new UserNotFoundError(id);
        }
        
        return updated;
    }

    async deleteUser(id: string): Promise<void> {
        const existing = await this.userRepository.findById(id);
        if (!existing) {
            throw new UserNotFoundError(id);
        }

        await this.userRepository.delete(id);
    }
}
