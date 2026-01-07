import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

export class FileNotFoundError extends Error {
    constructor(fileKey: string) {
        super(`File with key '${fileKey}' not found in R2`);
        this.name = 'FileNotFoundError';
    }
}

export class FileValidationError extends Error {
    constructor(message: string, public readonly fileName?: string) {
        super(message);
        this.name = 'FileValidationError';
    }
}

export class InvalidMimeTypeError extends Error {
    constructor(
        public readonly receivedType: string,
        public readonly allowedTypes: string[]
    ) {
        super(`Invalid file type: ${receivedType}. Allowed types: ${allowedTypes.join(', ')}`);
        this.name = 'InvalidMimeTypeError';
    }
}

export class FileSizeExceededError extends Error {
    constructor(
        public readonly fileSize: number,
        public readonly maxSize: number
    ) {
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
        const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
        super(`File size (${fileSizeMB}MB) exceeds maximum allowed size of ${maxSizeMB}MB`);
        this.name = 'FileSizeExceededError';
    }
}

export class NoFileProvidedError extends Error {
    constructor() {
        super('No file was provided in the request');
        this.name = 'NoFileProvidedError';
    }
}

export class MultipleFilesLimitError extends Error {
    constructor(
        public readonly receivedCount: number,
        public readonly maxCount: number
    ) {
        super(`Received ${receivedCount} files but maximum allowed is ${maxCount}`);
        this.name = 'MultipleFilesLimitError';
    }
}

export class UploadServiceError extends Error {
    constructor(message: string, public readonly cause?: unknown) {
        super(message);
        this.name = 'UploadServiceError';
    }
}

export class R2UploadError extends Error {
    constructor(message: string, public readonly cause?: unknown) {
        super(message);
        this.name = 'R2UploadError';
    }
}

export class R2DeleteError extends Error {
    constructor(fileKey: string, public readonly cause?: unknown) {
        super(`Failed to delete file '${fileKey}' from R2`);
        this.name = 'R2DeleteError';
    }
}

/**
 * Convierte errores de dominio de uploads a HTTPException de Hono
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
        case FileNotFoundError:
            return new HTTPException(404, { 
                message: error.message,
                cause: error 
            });

        case NoFileProvidedError:
        case FileValidationError:
        case InvalidMimeTypeError:
        case FileSizeExceededError:
        case MultipleFilesLimitError:
            return new HTTPException(400, { 
                message: error.message,
                cause: error
            });

        case R2UploadError:
            console.error('R2 upload error:', (error as R2UploadError).cause);
            return new HTTPException(500, { 
                message: 'Failed to upload file to storage',
                cause: error 
            });

        case R2DeleteError:
            console.error('R2 delete error:', (error as R2DeleteError).cause);
            return new HTTPException(500, { 
                message: 'Failed to delete file from storage',
                cause: error 
            });

        case UploadServiceError:
            console.error('Upload service error:', (error as UploadServiceError).cause);
            return new HTTPException(500, { 
                message: error.message,
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
