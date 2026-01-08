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
} from "@/lib/r2";
import { ValidateUploadDto } from "../../dtos/validate-upload.dto";
import {
    FileNotFoundError,
    FileValidationError,
    InvalidMimeTypeError,
    FileSizeExceededError,
    NoFileProvidedError,
    R2UploadError,
    R2DeleteError
} from "../../errors/upload.errors";
import { IUploadsService, ParsedFile } from "../upload.service";

export class UploadServiceImpl implements IUploadsService {
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

    async uploadChannelIcon(file: ParsedFile): Promise<UploadResult> {
        this.validateFile(file, ALLOWED_MIME_TYPES.IMAGES, FILE_SIZE_LIMITS.PROFILE);

        try {
            return await uploadToR2(file.arrayBuffer, file.name, file.type, R2Folder.CHANNEL_ICONS);
        } catch (error) {
            throw new R2UploadError("Failed to upload channel icon", error);
        }
    }

    async uploadChannelBanner(file: ParsedFile): Promise<UploadResult> {
        this.validateFile(file, ALLOWED_MIME_TYPES.IMAGES, FILE_SIZE_LIMITS.PROFILE);

        try {
            return await uploadToR2(file.arrayBuffer, file.name, file.type, R2Folder.CHANNEL_BANNERS);
        } catch (error) {
            throw new R2UploadError("Failed to upload channel banner", error);
        }
    }

    async uploadMessageImage(file: ParsedFile): Promise<UploadResult> {
        this.validateFile(file, ALLOWED_MIME_TYPES.IMAGES, FILE_SIZE_LIMITS.IMAGE);

        try {
            return await uploadToR2(file.arrayBuffer, file.name, file.type, R2Folder.MESSAGE_IMAGES);
        } catch (error) {
            throw new R2UploadError("Failed to upload message image", error);
        }
    }

    async uploadMessageAttachment(file: ParsedFile): Promise<UploadResult> {
        this.validateFile(file, ALLOWED_MIME_TYPES.ALL_ATTACHMENTS, FILE_SIZE_LIMITS.DOCUMENT);

        try {
            return await uploadToR2(file.arrayBuffer, file.name, file.type, R2Folder.MESSAGE_ATTACHMENTS);
        } catch (error) {
            throw new R2UploadError("Failed to upload message attachment", error);
        }
    }

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

    async uploadMessageVideo(file: ParsedFile): Promise<UploadResult> {
        this.validateFile(file, ALLOWED_MIME_TYPES.VIDEOS, FILE_SIZE_LIMITS.VIDEO);

        try {
            return await uploadToR2(file.arrayBuffer, file.name, file.type, R2Folder.MESSAGE_VIDEOS);
        } catch (error) {
            throw new R2UploadError("Failed to upload message video", error);
        }
    }

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

    async uploadMessageAudio(file: ParsedFile): Promise<UploadResult> {
        this.validateFile(file, ALLOWED_MIME_TYPES.AUDIOS, FILE_SIZE_LIMITS.AUDIO);

        try {
            return await uploadToR2(file.arrayBuffer, file.name, file.type, R2Folder.MESSAGE_AUDIOS);
        } catch (error) {
            throw new R2UploadError("Failed to upload message audio", error);
        }
    }

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
