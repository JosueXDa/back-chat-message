export class UserNotFoundError extends Error {
    constructor(userId: string) {
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
