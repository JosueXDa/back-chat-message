import { ChannelMemberRepository } from "../repositories/channel-member.repository";
import { 
    UnauthorizedChannelAccessError, 
    InsufficientPermissionsError 
} from "../errors/chat.errors";

export class AuthorizationService {
    constructor(
        private readonly channelMemberRepository: ChannelMemberRepository
    ) { }

    /**
     * Verifica que un usuario sea miembro de un canal.
     * Lanza error si no lo es.
     * 
     * @param channelId - ID del canal
     * @param userId - ID del usuario
     * @throws UnauthorizedChannelAccessError si el usuario no es miembro del canal
     */
    async requireChannelMembership(channelId: string, userId: string): Promise<void> {
        const isMember = await this.channelMemberRepository.isJoined(channelId, userId);
        if (!isMember) {
            throw new UnauthorizedChannelAccessError(channelId, userId);
        }
    }

    /**
     * Verifica que un usuario tenga permisos específicos en un canal.
     * Lanza error si no los tiene.
     * 
     * @param channelId - ID del canal
     * @param userId - ID del usuario
     * @param level - Nivel de permiso requerido ('moderator' | 'admin')
     * @throws InsufficientPermissionsError si el usuario no tiene los permisos requeridos
     */
    async requirePermission(channelId: string, userId: string, level: 'moderator' | 'admin'): Promise<void> {
        const hasPermission = await this.channelMemberRepository.hasPermission(channelId, userId, level);
        if (!hasPermission) {
            throw new InsufficientPermissionsError(level, 'perform this action');
        }
    }

    /**
     * Verifica que un usuario sea el creador de un recurso O tenga permisos de moderador.
     * Lanza error si ninguna condición se cumple.
     * 
     * @param channelId - ID del canal
     * @param userId - ID del usuario a validar
     * @param creatorId - ID del creador del recurso
     * @param level - Nivel de permiso alternativo requerido (default: 'moderator')
     * @throws InsufficientPermissionsError si el usuario no es creador ni tiene permisos
     */
    async requireOwnerOrPermission(
        channelId: string,
        userId: string,
        creatorId: string,
        level: 'moderator' | 'admin' = 'moderator'
    ): Promise<void> {
        // Si es el creador, permitir
        if (userId === creatorId) {
            return;
        }

        // Si no es creador, verificar permisos
        const hasPermission = await this.channelMemberRepository.hasPermission(channelId, userId, level);
        if (!hasPermission) {
            throw new InsufficientPermissionsError(level, `access this resource as owner or ${level}`);
        }
    }

    /**
     * Verifica si un usuario es miembro de un canal (sin lanzar error).
     * 
     * @param channelId - ID del canal
     * @param userId - ID del usuario
     * @returns true si es miembro, false si no lo es
     */
    async isChannelMember(channelId: string, userId: string): Promise<boolean> {
        return await this.channelMemberRepository.isJoined(channelId, userId);
    }

    /**
     * Verifica si un usuario tiene permisos específicos (sin lanzar error).
     * 
     * @param channelId - ID del canal
     * @param userId - ID del usuario
     * @param level - Nivel de permiso a verificar
     * @returns true si tiene permisos, false si no los tiene
     */
    async hasPermission(channelId: string, userId: string, level: 'moderator' | 'admin'): Promise<boolean> {
        return await this.channelMemberRepository.hasPermission(channelId, userId, level);
    }
}
