import { z } from "zod";

/**
 * Schema para un attachment individual
 */
export const messageAttachmentSchema = z.object({
    id: z.string().uuid(),
    url: z.string().url(),
    filename: z.string().min(1).max(255),
    mimeType: z.string().min(1),
    size: z.number().positive(),
    type: z.enum(['image', 'document', 'video', 'audio']),
});

export const createMessageDto = z.object({
    threadId: z.string().uuid(),
    content: z.string().min(1).or(z.literal('')), // Puede ser vacío si hay attachments
    senderId: z.string(), // Usually inferred from session, but good to have in DTO for internal use
    attachments: z.array(messageAttachmentSchema).max(10).optional(), // Máximo 10 archivos
}).refine(
    (data) => data.content.length > 0 || (data.attachments && data.attachments.length > 0),
    { message: "El mensaje debe tener contenido o al menos un archivo adjunto" }
);

export type MessageAttachmentDto = z.infer<typeof messageAttachmentSchema>;
export type CreateMessageDto = z.infer<typeof createMessageDto>;
