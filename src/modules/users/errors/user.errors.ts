import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

export class UserNotFoundError extends Error {
    constructor(public readonly userId: string) {
        super(`User with id '${userId}' not found`);
        this.name = 'UserNotFoundError';
    }
}

export class UserValidationError extends Error {
    constructor(message: string, public readonly details?: any) {
        super(message);
        this.name = 'UserValidationError';
    }
}

export class ProfileCreationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ProfileCreationError';
    }
}

export class UserRepositoryError extends Error {
    constructor(message: string, public readonly cause?: unknown) {
        super(message);
        this.name = 'UserRepositoryError';
    }
}

export class UnauthorizedUserActionError extends Error {
    constructor(
        public readonly requestedUserId: string,
        public readonly currentUserId: string,
        public readonly action: string
    ) {
        super(`User '${currentUserId}' is not authorized to ${action} user '${requestedUserId}'`);
        this.name = 'UnauthorizedUserActionError';
    }
}

/**
 * Convierte errores de dominio a HTTPException de Hono
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
        case UserNotFoundError:
            return new HTTPException(404, { 
                message: error.message,
                cause: error 
            });

        case UnauthorizedUserActionError:
            return new HTTPException(403, { 
                message: error.message,
                cause: error 
            });

        case ProfileCreationError:
        case UserValidationError:
            return new HTTPException(400, { 
                message: error.message,
                cause: error instanceof UserValidationError ? error.details : error
            });

        case UserRepositoryError:
            console.error('Repository error:', (error as UserRepositoryError).cause);
            return new HTTPException(500, { 
                message: 'Database operation failed',
                cause: error 
            });

        case ZodError:
            return new HTTPException(400, { 
                message: 'Validation error',
                cause: (error as ZodError).issues 
            });

        default:
            // Error genérico no manejado
            console.error('Unexpected error:', error);
            return new HTTPException(500, { 
                message: 'Internal Server Error',
                cause: error 
            });
    }
}
