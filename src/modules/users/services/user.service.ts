import { UpdateUserDto } from "../dtos/update-user.dto";
import type { IUserRepository } from "../repositories/user.repository";
import type { UserWithProfile } from "../entities";
import { UserNotFoundError, UnauthorizedUserActionError } from "../errors/user.errors";

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

    async updateUser(id: string, data: UpdateUserDto, currentUserId: string): Promise<UserWithProfile> {
        // Validar autorización: solo el propio usuario puede actualizarse
        if (currentUserId !== id) {
            throw new UnauthorizedUserActionError(id, currentUserId, 'update');
        }

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

    async deleteUser(id: string, currentUserId: string): Promise<void> {
        // Validar autorización: solo el propio usuario puede eliminarse
        if (currentUserId !== id) {
            throw new UnauthorizedUserActionError(id, currentUserId, 'delete');
        }

        const existing = await this.userRepository.findById(id);
        if (!existing) {
            throw new UserNotFoundError(id);
        }

        await this.userRepository.delete(id);
    }
}
