import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

// ============ ERRORES DE CANAL ============
export class ChannelNotFoundError extends Error {
    constructor(public readonly channelId: string) {
        super(`Channel '${channelId}' not found`);
        this.name = 'ChannelNotFoundError';
    }
}

export class ChannelAlreadyExistsError extends Error {
    constructor(public readonly channelName: string) {
        super(`Channel '${channelName}' already exists`);
        this.name = 'ChannelAlreadyExistsError';
    }
}

// ============ ERRORES DE THREAD ============
export class ThreadNotFoundError extends Error {
    constructor(public readonly threadId: string) {
        super(`Thread '${threadId}' not found`);
        this.name = 'ThreadNotFoundError';
    }
}

// ============ ERRORES DE MENSAJE ============
export class MessageNotFoundError extends Error {
    constructor(public readonly messageId: string) {
        super(`Message '${messageId}' not found`);
        this.name = 'MessageNotFoundError';
    }
}

export class InvalidMessageContentError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidMessageContentError';
    }
}

// ============ ERRORES DE MIEMBROS ============
export class MemberNotFoundError extends Error {
    constructor(
        public readonly channelId: string,
        public readonly userId: string
    ) {
        super(`Member '${userId}' not found in channel '${channelId}'`);
        this.name = 'MemberNotFoundError';
    }
}

export class MemberAlreadyExistsError extends Error {
    constructor(
        public readonly channelId: string,
        public readonly userId: string
    ) {
        super(`User '${userId}' is already a member of channel '${channelId}'`);
        this.name = 'MemberAlreadyExistsError';
    }
}

// ============ ERRORES DE AUTORIZACIÓN ============
export class UnauthorizedChannelAccessError extends Error {
    constructor(
        public readonly channelId: string,
        public readonly userId: string
    ) {
        super(`User '${userId}' is not authorized to access channel '${channelId}'`);
        this.name = 'UnauthorizedChannelAccessError';
    }
}

export class InsufficientPermissionsError extends Error {
    constructor(
        public readonly requiredRole: string,
        public readonly action: string
    ) {
        super(`Insufficient permissions: '${requiredRole}' role required to ${action}`);
        this.name = 'InsufficientPermissionsError';
    }
}

export class CannotModifyOwnerError extends Error {
    constructor() {
        super('Cannot modify or remove channel owner');
        this.name = 'CannotModifyOwnerError';
    }
}

// ============ ERRORES DE REPOSITORIO ============
export class ChatRepositoryError extends Error {
    constructor(message: string, public readonly cause?: unknown) {
        super(message);
        this.name = 'ChatRepositoryError';
    }
}

/**
 * Convierte errores de dominio de chat a HTTPException de Hono
 * Esto permite un manejo centralizado de errores usando el sistema nativo de Hono
 */
export function toHTTPException(error: unknown): HTTPException {
    // Determinar el tipo de error y mapear al código HTTP apropiado
    if (!(error instanceof Error)) {
        console.error('Unexpected non-Error thrown:', error);
        return new HTTPException(500, { 
            message: 'Internal Server Error',
            cause: error 
        });
    }

    switch (error.constructor) {
        // 404 - Not Found
        case ChannelNotFoundError:
        case ThreadNotFoundError:
        case MessageNotFoundError:
        case MemberNotFoundError:
            return new HTTPException(404, { 
                message: error.message,
                cause: error 
            });

        // 403 - Forbidden
        case UnauthorizedChannelAccessError:
        case InsufficientPermissionsError:
        case CannotModifyOwnerError:
            return new HTTPException(403, { 
                message: error.message,
                cause: error 
            });

        // 409 - Conflict
        case ChannelAlreadyExistsError:
        case MemberAlreadyExistsError:
            return new HTTPException(409, { 
                message: error.message,
                cause: error 
            });

        // 400 - Bad Request
        case InvalidMessageContentError:
            return new HTTPException(400, { 
                message: error.message,
                cause: error 
            });

        case ZodError:
            return new HTTPException(400, { 
                message: 'Validation error',
                cause: (error as ZodError).issues 
            });

        default:
            // 500 - Internal Server Error
            if (error instanceof ChatRepositoryError) {
                console.error('Repository error:', error.cause);
                return new HTTPException(500, { 
                    message: 'Database operation failed',
                    cause: error 
                });
            }

            console.error('Unexpected error:', error);
            return new HTTPException(500, { 
                message: 'Internal Server Error',
                cause: error 
            });
    }
}
