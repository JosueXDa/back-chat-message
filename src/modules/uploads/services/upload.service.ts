import { 
    validateFileExists, 
    extractFileKey, 
    deleteFromR2, 
    uploadToR2,
    uploadMultipleToR2,
    validateMimeType,
    validateFileSize,
    R2Folder,
    FILE_SIZE_LIMITS,
    ALLOWED_MIME_TYPES,
    UploadResult
} from "../../../lib/r2";
import { ValidateUploadDto } from "../dtos/validate-upload.dto";
import {
    FileNotFoundError,
    FileValidationError,
    InvalidMimeTypeError,
    FileSizeExceededError,
    NoFileProvidedError,
    R2UploadError,
    R2DeleteError
} from "../errors/upload.errors";

/**
 * Interfaz para un archivo parseado del formulario multipart
 */
export interface ParsedFile {
    /** Contenido del archivo como ArrayBuffer */
    arrayBuffer: ArrayBuffer;
    /** Nombre original del archivo */
    name: string;
    /** Tipo MIME del archivo */
    type: string;
    /** Tamaño en bytes */
    size: number;
}

export class UploadService {
    /**
     * Valida que el archivo fue subido a R2 correctamente
     * Usa el fileKey directamente del DTO para mayor eficiencia
     */
    async validateUpload(data: ValidateUploadDto): Promise<boolean> {
        const exists = await validateFileExists(data.fileKey);

        if (!exists) {
            throw new FileNotFoundError(data.fileKey);
        }

        return true;
    }

    /**
     * Valida un archivo antes de subirlo
     * @param file - Archivo a validar
     * @param allowedTypes - Tipos MIME permitidos
     * @param maxSize - Tamaño máximo en bytes
     * @throws {NoFileProvidedError} Si no se proporciona un archivo
     * @throws {InvalidMimeTypeError} Si el tipo MIME no está permitido
     * @throws {FileSizeExceededError} Si el archivo excede el tamaño máximo
     */
    validateFile(file: ParsedFile, allowedTypes: string[], maxSize: number): void {
        if (!file || !file.arrayBuffer) {
            throw new NoFileProvidedError();
        }

        if (!validateMimeType(file.type, allowedTypes)) {
            throw new InvalidMimeTypeError(file.type, allowedTypes);
        }

        if (!validateFileSize(file.size, maxSize)) {
            throw new FileSizeExceededError(file.size, maxSize);
        }
    }

    /**
     * Sube un avatar de perfil
     */
    async uploadProfileAvatar(file: ParsedFile): Promise<UploadResult> {
        this.validateFile(file, ALLOWED_MIME_TYPES.IMAGES, FILE_SIZE_LIMITS.PROFILE);

        try {
            return await uploadToR2(file.arrayBuffer, file.name, file.type, R2Folder.PROFILE_AVATARS);
        } catch (error) {
            throw new R2UploadError("Failed to upload profile avatar", error);
        }
    }

    /**
     * Sube un banner de perfil
     */
    async uploadProfileBanner(file: ParsedFile): Promise<UploadResult> {
        this.validateFile(file, ALLOWED_MIME_TYPES.IMAGES, FILE_SIZE_LIMITS.PROFILE);

        try {
            return await uploadToR2(file.arrayBuffer, file.name, file.type, R2Folder.PROFILE_BANNERS);
        } catch (error) {
            throw new R2UploadError("Failed to upload profile banner", error);
        }
    }

    /**
     * Sube un icono de canal
     */
    async uploadChannelIcon(file: ParsedFile): Promise<UploadResult> {
        this.validateFile(file, ALLOWED_MIME_TYPES.IMAGES, FILE_SIZE_LIMITS.PROFILE);

        try {
            return await uploadToR2(file.arrayBuffer, file.name, file.type, R2Folder.CHANNEL_ICONS);
        } catch (error) {
            throw new R2UploadError("Failed to upload channel icon", error);
        }
    }

    /**
     * Sube un banner de canal
     */
    async uploadChannelBanner(file: ParsedFile): Promise<UploadResult> {
        this.validateFile(file, ALLOWED_MIME_TYPES.IMAGES, FILE_SIZE_LIMITS.PROFILE);

        try {
            return await uploadToR2(file.arrayBuffer, file.name, file.type, R2Folder.CHANNEL_BANNERS);
        } catch (error) {
            throw new R2UploadError("Failed to upload channel banner", error);
        }
    }

    /**
     * Sube una imagen de mensaje
     */
    async uploadMessageImage(file: ParsedFile): Promise<UploadResult> {
        this.validateFile(file, ALLOWED_MIME_TYPES.IMAGES, FILE_SIZE_LIMITS.IMAGE);

        try {
            return await uploadToR2(file.arrayBuffer, file.name, file.type, R2Folder.MESSAGE_IMAGES);
        } catch (error) {
            throw new R2UploadError("Failed to upload message image", error);
        }
    }

    /**
     * Sube un adjunto de mensaje (documentos, imágenes, etc.)
     */
    async uploadMessageAttachment(file: ParsedFile): Promise<UploadResult> {
        this.validateFile(file, ALLOWED_MIME_TYPES.ALL_ATTACHMENTS, FILE_SIZE_LIMITS.DOCUMENT);

        try {
            return await uploadToR2(file.arrayBuffer, file.name, file.type, R2Folder.MESSAGE_ATTACHMENTS);
        } catch (error) {
            throw new R2UploadError("Failed to upload message attachment", error);
        }
    }

    /**
     * Sube múltiples imágenes de mensaje
     */
    async uploadMultipleMessageImages(files: ParsedFile[]): Promise<UploadResult[]> {
        // Validar todos los archivos primero
        for (const file of files) {
            try {
                this.validateFile(file, ALLOWED_MIME_TYPES.IMAGES, FILE_SIZE_LIMITS.IMAGE);
            } catch (error) {
                if (error instanceof FileValidationError || error instanceof InvalidMimeTypeError || error instanceof FileSizeExceededError) {
                    throw new FileValidationError(`Error in file ${file.name}: ${error.message}`, file.name);
                }
                throw error;
            }
        }

        const preparedFiles = files.map(file => ({
            file: file.arrayBuffer,
            filename: file.name,
            contentType: file.type,
        }));

        try {
            return await uploadMultipleToR2(preparedFiles, R2Folder.MESSAGE_IMAGES);
        } catch (error) {
            throw new R2UploadError("Failed to upload multiple message images", error);
        }
    }

    /**
     * Sube múltiples adjuntos de mensaje
     */
    async uploadMultipleMessageAttachments(files: ParsedFile[]): Promise<UploadResult[]> {
        // Validar todos los archivos primero
        for (const file of files) {
            try {
                this.validateFile(file, ALLOWED_MIME_TYPES.ALL_ATTACHMENTS, FILE_SIZE_LIMITS.DOCUMENT);
            } catch (error) {
                if (error instanceof FileValidationError || error instanceof InvalidMimeTypeError || error instanceof FileSizeExceededError) {
                    throw new FileValidationError(`Error in file ${file.name}: ${error.message}`, file.name);
                }
                throw error;
            }
        }

        const preparedFiles = files.map(file => ({
            file: file.arrayBuffer,
            filename: file.name,
            contentType: file.type,
        }));

        try {
            return await uploadMultipleToR2(preparedFiles, R2Folder.MESSAGE_ATTACHMENTS);
        } catch (error) {
            throw new R2UploadError("Failed to upload multiple message attachments", error);
        }
    }

    /**
     * Sube un video de mensaje
     */
    async uploadMessageVideo(file: ParsedFile): Promise<UploadResult> {
        this.validateFile(file, ALLOWED_MIME_TYPES.VIDEOS, FILE_SIZE_LIMITS.VIDEO);

        try {
            return await uploadToR2(file.arrayBuffer, file.name, file.type, R2Folder.MESSAGE_VIDEOS);
        } catch (error) {
            throw new R2UploadError("Failed to upload message video", error);
        }
    }

    /**
     * Sube múltiples videos de mensaje
     */
    async uploadMultipleMessageVideos(files: ParsedFile[]): Promise<UploadResult[]> {
        // Validar todos los archivos primero
        for (const file of files) {
            try {
                this.validateFile(file, ALLOWED_MIME_TYPES.VIDEOS, FILE_SIZE_LIMITS.VIDEO);
            } catch (error) {
                if (error instanceof FileValidationError || error instanceof InvalidMimeTypeError || error instanceof FileSizeExceededError) {
                    throw new FileValidationError(`Error in file ${file.name}: ${error.message}`, file.name);
                }
                throw error;
            }
        }

        const preparedFiles = files.map(file => ({
            file: file.arrayBuffer,
            filename: file.name,
            contentType: file.type,
        }));

        try {
            return await uploadMultipleToR2(preparedFiles, R2Folder.MESSAGE_VIDEOS);
        } catch (error) {
            throw new R2UploadError("Failed to upload multiple message videos", error);
        }
    }

    /**
     * Sube un audio de mensaje
     */
    async uploadMessageAudio(file: ParsedFile): Promise<UploadResult> {
        this.validateFile(file, ALLOWED_MIME_TYPES.AUDIOS, FILE_SIZE_LIMITS.AUDIO);

        try {
            return await uploadToR2(file.arrayBuffer, file.name, file.type, R2Folder.MESSAGE_AUDIOS);
        } catch (error) {
            throw new R2UploadError("Failed to upload message audio", error);
        }
    }

    /**
     * Sube múltiples audios de mensaje
     */
    async uploadMultipleMessageAudios(files: ParsedFile[]): Promise<UploadResult[]> {
        // Validar todos los archivos primero
        for (const file of files) {
            try {
                this.validateFile(file, ALLOWED_MIME_TYPES.AUDIOS, FILE_SIZE_LIMITS.AUDIO);
            } catch (error) {
                if (error instanceof FileValidationError || error instanceof InvalidMimeTypeError || error instanceof FileSizeExceededError) {
                    throw new FileValidationError(`Error in file ${file.name}: ${error.message}`, file.name);
                }
                throw error;
            }
        }

        const preparedFiles = files.map(file => ({
            file: file.arrayBuffer,
            filename: file.name,
            contentType: file.type,
        }));

        try {
            return await uploadMultipleToR2(preparedFiles, R2Folder.MESSAGE_AUDIOS);
        } catch (error) {
            throw new R2UploadError("Failed to upload multiple message audios", error);
        }
    }

    /**
     * Elimina un archivo anterior si el usuario actualiza su recurso
     */
    async replaceFile(oldPublicUrl: string | null, newPublicUrl: string): Promise<void> {
        if (oldPublicUrl && oldPublicUrl !== newPublicUrl) {
            try {
                const oldFileKey = extractFileKey(oldPublicUrl);
                await deleteFromR2(oldFileKey);
            } catch (error) {
                console.error("Error deleting old file from R2:", error);
                // No lanzamos error para no bloquear la actualización
            }
        }
    }

    /**
     * Elimina un archivo de R2
     */
    async deleteFile(publicUrl: string): Promise<void> {
        try {
            const fileKey = extractFileKey(publicUrl);
            await deleteFromR2(fileKey);
        } catch (error) {
            const fileKey = extractFileKey(publicUrl);
            throw new R2DeleteError(fileKey, error);
        }
    }
}
