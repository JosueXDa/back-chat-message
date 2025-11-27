import { profile as profiles } from "../../../db/schema/profile.entity";
import { users } from "../../../db/schema/users.entity";
import { UpdateUserDto } from "../dtos/update-user.dto";
import { UserRepository, UserRow } from "../repositories/user.repository";

export type UserWithProfile = typeof users.$inferSelect & {
    profile: typeof profiles.$inferSelect | null;
};

export class UserService {
    constructor(private readonly userRepository: UserRepository) {}

    async getUsers(): Promise<UserWithProfile[]> {
        const rows = await this.userRepository.findAll();
        return rows.map((row) => this.mapRow(row));
    }

    async getUserById(id: string): Promise<UserWithProfile | null> {
        const row = await this.userRepository.findById(id);
        return row ? this.mapRow(row) : null;
    }

    async updateUser(id: string, data: UpdateUserDto): Promise<UserWithProfile | null> {
        const existing = await this.userRepository.findById(id);
        if (!existing) {
            return null;
        }

        const updatedRow = await this.userRepository.update(id, data);
        return updatedRow ? this.mapRow(updatedRow) : null;
    }

    async deleteUser(id: string): Promise<boolean> {
        const existing = await this.userRepository.findById(id);
        if (!existing) {
            return false;
        }

        await this.userRepository.delete(id);
        return true;
    }

    private mapRow(row: UserRow): UserWithProfile {
        return {
            ...row.user,
            profile: row.profile,
        };
    }
}
