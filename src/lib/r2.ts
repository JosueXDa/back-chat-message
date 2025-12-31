import { 
    S3Client, 
    PutObjectCommand, 
    HeadObjectCommand, 
    DeleteObjectCommand,
    GetObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Validación de variables de entorno al inicio
const validateEnvVars = () => {
    const required = [
        'R2_ENDPOINT', 
        'R2_ACCESS_KEY_ID', 
        'R2_SECRET_ACCESS_KEY', 
        'R2_BUCKET_NAME', 
        'R2_PUBLIC_URL'
    ];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
};

validateEnvVars();

const r2Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
});

/**
 * Configuración de límites de archivos
 */
export const FILE_SIZE_LIMITS = {
    /** Tamaño máximo para imágenes: 10MB */
    IMAGE: 10 * 1024 * 1024,
    /** Tamaño máximo para documentos: 25MB */
    DOCUMENT: 25 * 1024 * 1024,
    /** Tamaño máximo para avatares/banners: 5MB */
    PROFILE: 5 * 1024 * 1024,
};

/**
 * Tipos MIME permitidos por categoría
 */
export const ALLOWED_MIME_TYPES = {
    IMAGES: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    DOCUMENTS: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "text/csv",
    ],
    ALL_ATTACHMENTS: [] as string[], // Se llenará abajo
};

// Combina todos los tipos de attachments permitidos
ALLOWED_MIME_TYPES.ALL_ATTACHMENTS = [
    ...ALLOWED_MIME_TYPES.IMAGES,
    ...ALLOWED_MIME_TYPES.DOCUMENTS,
];

/**
 * Enum para las carpetas organizadas en R2
 */
export enum R2Folder {
    PROFILE_AVATARS = "profiles/avatars",
    PROFILE_BANNERS = "profiles/banners",
    CHANNEL_ICONS = "channels/icons",
    CHANNEL_BANNERS = "channels/banners",
    MESSAGE_ATTACHMENTS = "messages/attachments",
    MESSAGE_IMAGES = "messages/images",
    TEMP = "tmp/uploads",
}

/**
 * Resultado de una operación de upload
 */
export interface UploadResult {
    /** Clave única del archivo en R2 */
    fileKey: string;
    /** URL pública para acceder al archivo */
    publicUrl: string;
    /** Nombre original del archivo */
    filename: string;
    /** Tipo MIME del archivo */
    contentType: string;
    /** Tamaño del archivo en bytes */
    size: number;
}

/**
 * Sanitiza el nombre de un archivo para evitar problemas de seguridad y compatibilidad
 * @param filename - Nombre original del archivo
 * @returns Nombre sanitizado
 */
export const sanitizeFilename = (filename: string): string => {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
};

/**
 * Genera una clave única para el archivo en R2
 * @param filename - Nombre del archivo (ya sanitizado)
 * @param folder - Carpeta destino
 * @returns Clave única
 */
export const generateFileKey = (filename: string, folder: R2Folder): string => {
    const sanitized = sanitizeFilename(filename);
    return `${folder}/${Date.now()}-${sanitized}`;
};

/**
 * Sube un archivo directamente a R2 desde el backend
 * @param file - Archivo como Buffer o ArrayBuffer
 * @param filename - Nombre original del archivo
 * @param contentType - Tipo MIME del archivo
 * @param folder - Carpeta destino en R2
 * @returns Resultado del upload con URLs y metadata
 */
export const uploadToR2 = async (
    file: Buffer | ArrayBuffer,
    filename: string,
    contentType: string,
    folder: R2Folder
): Promise<UploadResult> => {
    try {
        const fileKey = generateFileKey(filename, folder);
        // Convertir ArrayBuffer a Buffer correctamente
        const buffer = file instanceof Buffer ? file : Buffer.from(new Uint8Array(file));
        
        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: fileKey,
            Body: buffer,
            ContentType: contentType,
            ContentLength: buffer.length,
        });
        
        await r2Client.send(command);
        
        return {
            fileKey,
            publicUrl: `${process.env.R2_PUBLIC_URL}/${fileKey}`,
            filename: sanitizeFilename(filename),
            contentType,
            size: buffer.length,
        };
    } catch (error) {
        console.error('Error uploading file to R2:', error);
        throw new Error('Error al subir el archivo');
    }
};

/**
 * Sube múltiples archivos a R2 en paralelo
 * @param files - Array de archivos con su metadata
 * @param folder - Carpeta destino en R2
 * @returns Array de resultados de upload
 */
export const uploadMultipleToR2 = async (
    files: Array<{
        file: Buffer | ArrayBuffer;
        filename: string;
        contentType: string;
    }>,
    folder: R2Folder
): Promise<UploadResult[]> => {
    const uploadPromises = files.map(({ file, filename, contentType }) =>
        uploadToR2(file, filename, contentType, folder)
    );
    
    return Promise.all(uploadPromises);
};

/**
 * Valida el tipo MIME de un archivo
 * @param contentType - Tipo MIME a validar
 * @param allowedTypes - Array de tipos permitidos
 * @returns true si es válido
 */
export const validateMimeType = (contentType: string, allowedTypes: string[]): boolean => {
    return allowedTypes.includes(contentType);
};

/**
 * Valida el tamaño de un archivo
 * @param size - Tamaño en bytes
 * @param maxSize - Tamaño máximo permitido en bytes
 * @returns true si es válido
 */
export const validateFileSize = (size: number, maxSize: number): boolean => {
    return size > 0 && size <= maxSize;
};

/**
 * Valida que un archivo existe en R2 después de que el frontend lo subió
 * Usa HeadObjectCommand para verificar existencia sin descargar el archivo
 * @param fileKey - Identificador del archivo en R2
 * @returns true si el archivo existe, false en caso contrario
 */
export const validateFileExists = async (fileKey: string): Promise<boolean> => {
    try {
        const command = new HeadObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: fileKey,
        });
        await r2Client.send(command);
        return true;
    } catch (error: any) {
        // Solo retorna false si es NotFound, otros errores deberían propagarse
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
            return false;
        }
        console.error('Error validating file existence:', error);
        throw error;
    }
};

/**
 * Obtiene los metadatos de un archivo en R2
 * @param fileKey - Identificador del archivo en R2
 * @returns Metadatos del archivo o null si no existe
 */
export const getFileMetadata = async (fileKey: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
} | null> => {
    try {
        const command = new HeadObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: fileKey,
        });
        const response = await r2Client.send(command);
        return {
            size: response.ContentLength || 0,
            contentType: response.ContentType || 'application/octet-stream',
            lastModified: response.LastModified || new Date(),
        };
    } catch (error: any) {
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
            return null;
        }
        throw error;
    }
};

/**
 * Elimina un archivo de R2
 * @param fileKey - Identificador del archivo en R2
 */
export const deleteFromR2 = async (fileKey: string): Promise<void> => {
    try {
        const command = new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: fileKey,
        });
        await r2Client.send(command);
    } catch (error) {
        console.error('Error deleting file from R2:', error);
        throw new Error('Failed to delete file');
    }
};

/**
 * Extrae el fileKey de una URL pública completa
 * @param publicUrl - URL pública del archivo
 * @returns fileKey extraído
 */
export const extractFileKey = (publicUrl: string): string => {
    const baseUrl = process.env.R2_PUBLIC_URL!;
    
    // Maneja tanto URLs con / al final como sin ella
    if (publicUrl.startsWith(baseUrl)) {
        return publicUrl.replace(baseUrl + '/', '').replace(baseUrl, '');
    }
    
    // Si no coincide con la URL base, asume que ya es un fileKey
    return publicUrl;
};

/**
 * Genera una URL firmada para descargar/ver un archivo (opcional pero útil)
 * @param fileKey - Identificador del archivo en R2
 * @param expiresIn - Tiempo de expiración en segundos (default: 1 hora)
 */
export const generatePresignedDownloadUrl = async (
    fileKey: string,
    expiresIn: number = 3600
): Promise<string> => {
    try {
        const command = new HeadObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: fileKey,
        });
        
        return await getSignedUrl(r2Client, command, { expiresIn });
    } catch (error) {
        console.error('Error generating download URL:', error);
        throw new Error('Failed to generate download URL');
    }
};