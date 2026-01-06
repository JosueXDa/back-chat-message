import { ChannelMemberRepository } from "../repositories/channel-member.repository";

/**
 * AuthorizationService
 * 
 * Servicio centralizado para validación de permisos y autorización.
 * 
 * Principios aplicados:
 * - DRY (Don't Repeat Yourself): Evita duplicación de lógica de autorización
 * - Single Responsibility: Solo se encarga de validar permisos
 * - Fail Fast: Lanza excepciones inmediatamente si no hay permisos
 * 
 * Beneficios:
 * - Centraliza todas las validaciones de permisos
 * - Facilita cambios en la lógica de autorización
 * - Mejora la consistencia en mensajes de error
 * - Simplifica testing de permisos
 */
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
     * @throws Error si el usuario no es miembro del canal
     */
    async requireChannelMembership(channelId: string, userId: string): Promise<void> {
        const isMember = await this.channelMemberRepository.isJoined(channelId, userId);
        if (!isMember) {
            throw new Error("User is not a member of this channel");
        }
    }

    /**
     * Verifica que un usuario tenga permisos específicos en un canal.
     * Lanza error si no los tiene.
     * 
     * @param channelId - ID del canal
     * @param userId - ID del usuario
     * @param level - Nivel de permiso requerido ('moderator' | 'admin')
     * @throws Error si el usuario no tiene los permisos requeridos
     */
    async requirePermission(channelId: string, userId: string, level: 'moderator' | 'admin'): Promise<void> {
        const hasPermission = await this.channelMemberRepository.hasPermission(channelId, userId, level);
        if (!hasPermission) {
            throw new Error(`Insufficient permissions: ${level} role required`);
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
     * @throws Error si el usuario no es creador ni tiene permisos
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
            throw new Error(`Insufficient permissions: must be owner or have ${level} role`);
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
