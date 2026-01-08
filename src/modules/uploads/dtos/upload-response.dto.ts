import { z } from "zod";

/**
 * Schema para la respuesta de un upload exitoso
 */
export const UploadResponseDto = z.object({
    /** Clave única del archivo en R2 */
    fileKey: z.string(),
    /** URL pública para acceder al archivo */
    publicUrl: z.string().url(),
    /** Nombre original del archivo (sanitizado) */
    filename: z.string(),
    /** Tipo MIME del archivo */
    contentType: z.string(),
    /** Tamaño del archivo en bytes */
    size: z.number(),
});

export type UploadResponseDto = z.infer<typeof UploadResponseDto>;

/**
 * Schema para la respuesta de múltiples uploads
 */
export const MultipleUploadResponseDto = z.object({
    success: z.boolean(),
    data: z.array(UploadResponseDto),
});

export type MultipleUploadResponseDto = z.infer<typeof MultipleUploadResponseDto>;

/**
 * Schema para información de límites de upload
 */
export const UploadLimitsDto = z.object({
    limits: z.object({
        image: z.object({
            maxSize: z.number(),
            maxSizeMB: z.number(),
            allowedTypes: z.array(z.string()),
        }),
        document: z.object({
            maxSize: z.number(),
            maxSizeMB: z.number(),
            allowedTypes: z.array(z.string()),
        }),
        profile: z.object({
            maxSize: z.number(),
            maxSizeMB: z.number(),
            allowedTypes: z.array(z.string()),
        }),
        attachment: z.object({
            maxSize: z.number(),
            maxSizeMB: z.number(),
            allowedTypes: z.array(z.string()),
        }),
    }),
    maxFilesPerRequest: z.number(),
});

export type UploadLimitsDto = z.infer<typeof UploadLimitsDto>;
