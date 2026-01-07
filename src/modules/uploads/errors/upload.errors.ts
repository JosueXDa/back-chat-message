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
