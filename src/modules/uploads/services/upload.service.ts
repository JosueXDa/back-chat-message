import { UploadResult } from "@/lib/r2";
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
 * Interfaz del servicio de uploads
 * Define el contrato para todas las operaciones de carga de archivos
 */
export interface IUploadsService {
    /**
     * Valida que el archivo fue subido a R2 correctamente
     */
    validateUpload(data: ValidateUploadDto): Promise<boolean>;

    /**
     * Valida un archivo antes de subirlo
     */
    validateFile(file: ParsedFile, allowedTypes: string[], maxSize: number): void;

    /**
     * Sube un avatar de perfil
     */
    uploadProfileAvatar(file: ParsedFile): Promise<UploadResult>;

    /**
     * Sube un banner de perfil
     */
    uploadProfileBanner(file: ParsedFile): Promise<UploadResult>;

    /**
     * Sube un icono de canal
     */
    uploadChannelIcon(file: ParsedFile): Promise<UploadResult>;

    /**
     * Sube un banner de canal
     */
    uploadChannelBanner(file: ParsedFile): Promise<UploadResult>;

    /**
     * Sube una imagen de mensaje
     */
    uploadMessageImage(file: ParsedFile): Promise<UploadResult>;

    /**
     * Sube un adjunto de mensaje (documentos, imágenes, etc.)
     */
    uploadMessageAttachment(file: ParsedFile): Promise<UploadResult>;

    /**
     * Sube múltiples imágenes de mensaje
     */
    uploadMultipleMessageImages(files: ParsedFile[]): Promise<UploadResult[]>;

    /**
     * Sube múltiples adjuntos de mensaje
     */
    uploadMultipleMessageAttachments(files: ParsedFile[]): Promise<UploadResult[]>;

    /**
     * Sube un video de mensaje
     */
    uploadMessageVideo(file: ParsedFile): Promise<UploadResult>;

    /**
     * Sube múltiples videos de mensaje
     */
    uploadMultipleMessageVideos(files: ParsedFile[]): Promise<UploadResult[]>;

    /**
     * Sube un audio de mensaje
     */
    uploadMessageAudio(file: ParsedFile): Promise<UploadResult>;

    /**
     * Sube múltiples audios de mensaje
     */
    uploadMultipleMessageAudios(files: ParsedFile[]): Promise<UploadResult[]>;

    /**
     * Elimina un archivo anterior si el usuario actualiza su recurso
     */
    replaceFile(oldPublicUrl: string | null, newPublicUrl: string): Promise<void>;

    /**
     * Elimina un archivo de R2
     */
    deleteFile(publicUrl: string): Promise<void>;
}