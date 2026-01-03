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

/**
 * Resultado de validación de archivo
 */
export interface FileValidationResult {
    valid: boolean;
    error?: string;
}

export class UploadService {
    /**
     * Valida que el archivo fue subido a R2 correctamente
     * Usa el fileKey directamente del DTO para mayor eficiencia
     */
    async validateUpload(data: ValidateUploadDto): Promise<boolean> {
        const exists = await validateFileExists(data.fileKey);

        if (!exists) {
            throw new Error("Archivo no encontrado en R2");
        }

        return true;
    }

    /**
     * Valida un archivo antes de subirlo
     * @param file - Archivo a validar
     * @param allowedTypes - Tipos MIME permitidos
     * @param maxSize - Tamaño máximo en bytes
     */
    validateFile(file: ParsedFile, allowedTypes: string[], maxSize: number): FileValidationResult {
        if (!file || !file.arrayBuffer) {
            return { valid: false, error: "No se recibió ningún archivo" };
        }

        if (!validateMimeType(file.type, allowedTypes)) {
            return { 
                valid: false, 
                error: `Tipo de archivo no permitido: ${file.type}. Tipos permitidos: ${allowedTypes.join(', ')}` 
            };
        }

        if (!validateFileSize(file.size, maxSize)) {
            const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
            return { 
                valid: false, 
                error: `El archivo excede el tamaño máximo permitido de ${maxSizeMB}MB` 
            };
        }

        return { valid: true };
    }

    /**
     * Sube un avatar de perfil
     */
    async uploadProfileAvatar(file: ParsedFile): Promise<UploadResult> {
        const validation = this.validateFile(file, ALLOWED_MIME_TYPES.IMAGES, FILE_SIZE_LIMITS.PROFILE);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        return uploadToR2(file.arrayBuffer, file.name, file.type, R2Folder.PROFILE_AVATARS);
    }

    /**
     * Sube un banner de perfil
     */
    async uploadProfileBanner(file: ParsedFile): Promise<UploadResult> {
        const validation = this.validateFile(file, ALLOWED_MIME_TYPES.IMAGES, FILE_SIZE_LIMITS.PROFILE);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        return uploadToR2(file.arrayBuffer, file.name, file.type, R2Folder.PROFILE_BANNERS);
    }

    /**
     * Sube un icono de canal
     */
    async uploadChannelIcon(file: ParsedFile): Promise<UploadResult> {
        const validation = this.validateFile(file, ALLOWED_MIME_TYPES.IMAGES, FILE_SIZE_LIMITS.PROFILE);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        return uploadToR2(file.arrayBuffer, file.name, file.type, R2Folder.CHANNEL_ICONS);
    }

    /**
     * Sube un banner de canal
     */
    async uploadChannelBanner(file: ParsedFile): Promise<UploadResult> {
        const validation = this.validateFile(file, ALLOWED_MIME_TYPES.IMAGES, FILE_SIZE_LIMITS.PROFILE);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        return uploadToR2(file.arrayBuffer, file.name, file.type, R2Folder.CHANNEL_BANNERS);
    }

    /**
     * Sube una imagen de mensaje
     */
    async uploadMessageImage(file: ParsedFile): Promise<UploadResult> {
        const validation = this.validateFile(file, ALLOWED_MIME_TYPES.IMAGES, FILE_SIZE_LIMITS.IMAGE);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        return uploadToR2(file.arrayBuffer, file.name, file.type, R2Folder.MESSAGE_IMAGES);
    }

    /**
     * Sube un adjunto de mensaje (documentos, imágenes, etc.)
     */
    async uploadMessageAttachment(file: ParsedFile): Promise<UploadResult> {
        const validation = this.validateFile(file, ALLOWED_MIME_TYPES.ALL_ATTACHMENTS, FILE_SIZE_LIMITS.DOCUMENT);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        return uploadToR2(file.arrayBuffer, file.name, file.type, R2Folder.MESSAGE_ATTACHMENTS);
    }

    /**
     * Sube múltiples imágenes de mensaje
     */
    async uploadMultipleMessageImages(files: ParsedFile[]): Promise<UploadResult[]> {
        // Validar todos los archivos primero
        for (const file of files) {
            const validation = this.validateFile(file, ALLOWED_MIME_TYPES.IMAGES, FILE_SIZE_LIMITS.IMAGE);
            if (!validation.valid) {
                throw new Error(`Error en archivo ${file.name}: ${validation.error}`);
            }
        }

        const preparedFiles = files.map(file => ({
            file: file.arrayBuffer,
            filename: file.name,
            contentType: file.type,
        }));

        return uploadMultipleToR2(preparedFiles, R2Folder.MESSAGE_IMAGES);
    }

    /**
     * Sube múltiples adjuntos de mensaje
     */
    async uploadMultipleMessageAttachments(files: ParsedFile[]): Promise<UploadResult[]> {
        // Validar todos los archivos primero
        for (const file of files) {
            const validation = this.validateFile(file, ALLOWED_MIME_TYPES.ALL_ATTACHMENTS, FILE_SIZE_LIMITS.DOCUMENT);
            if (!validation.valid) {
                throw new Error(`Error en archivo ${file.name}: ${validation.error}`);
            }
        }

        const preparedFiles = files.map(file => ({
            file: file.arrayBuffer,
            filename: file.name,
            contentType: file.type,
        }));

        return uploadMultipleToR2(preparedFiles, R2Folder.MESSAGE_ATTACHMENTS);
    }

    /**
     * Sube un video de mensaje
     */
    async uploadMessageVideo(file: ParsedFile): Promise<UploadResult> {
        const validation = this.validateFile(file, ALLOWED_MIME_TYPES.VIDEOS, FILE_SIZE_LIMITS.VIDEO);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        return uploadToR2(file.arrayBuffer, file.name, file.type, R2Folder.MESSAGE_VIDEOS);
    }

    /**
     * Sube múltiples videos de mensaje
     */
    async uploadMultipleMessageVideos(files: ParsedFile[]): Promise<UploadResult[]> {
        // Validar todos los archivos primero
        for (const file of files) {
            const validation = this.validateFile(file, ALLOWED_MIME_TYPES.VIDEOS, FILE_SIZE_LIMITS.VIDEO);
            if (!validation.valid) {
                throw new Error(`Error en archivo ${file.name}: ${validation.error}`);
            }
        }

        const preparedFiles = files.map(file => ({
            file: file.arrayBuffer,
            filename: file.name,
            contentType: file.type,
        }));

        return uploadMultipleToR2(preparedFiles, R2Folder.MESSAGE_VIDEOS);
    }

    /**
     * Sube un audio de mensaje
     */
    async uploadMessageAudio(file: ParsedFile): Promise<UploadResult> {
        const validation = this.validateFile(file, ALLOWED_MIME_TYPES.AUDIOS, FILE_SIZE_LIMITS.AUDIO);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        return uploadToR2(file.arrayBuffer, file.name, file.type, R2Folder.MESSAGE_AUDIOS);
    }

    /**
     * Sube múltiples audios de mensaje
     */
    async uploadMultipleMessageAudios(files: ParsedFile[]): Promise<UploadResult[]> {
        // Validar todos los archivos primero
        for (const file of files) {
            const validation = this.validateFile(file, ALLOWED_MIME_TYPES.AUDIOS, FILE_SIZE_LIMITS.AUDIO);
            if (!validation.valid) {
                throw new Error(`Error en archivo ${file.name}: ${validation.error}`);
            }
        }

        const preparedFiles = files.map(file => ({
            file: file.arrayBuffer,
            filename: file.name,
            contentType: file.type,
        }));

        return uploadMultipleToR2(preparedFiles, R2Folder.MESSAGE_AUDIOS);
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
                console.error("Error eliminando archivo anterior de R2:", error);
                // No lanzamos error, solo logueamos para no bloquear la actualización
            }
        }
    }

    /**
     * Elimina un archivo de R2
     */
    async deleteFile(publicUrl: string): Promise<void> {
        const fileKey = extractFileKey(publicUrl);
        await deleteFromR2(fileKey);
    }
}
