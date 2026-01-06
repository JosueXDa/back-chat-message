import { UpdateUserDto } from "../dtos/update-user.dto";
import { UserRepository } from "../repositories/user.repository";
import type { UserWithProfile } from "../entities";

export class UserService {
    constructor(private readonly userRepository: UserRepository) { }

    async getUsers(): Promise<UserWithProfile[]> {
        return await this.userRepository.findAll();
    }

    async getUserById(id: string): Promise<UserWithProfile | null> {
        const user = await this.userRepository.findById(id);
        return user ?? null;
    }

    async updateUser(id: string, data: UpdateUserDto): Promise<UserWithProfile | null> {
        const existing = await this.userRepository.findById(id);
        if (!existing) {
            return null;
        }

        const updated = await this.userRepository.update(id, data);
        return updated ?? null;
    }

    async deleteUser(id: string): Promise<boolean> {
        const existing = await this.userRepository.findById(id);
        if (!existing) {
            return false;
        }

        await this.userRepository.delete(id);
        return true;
    }
}
