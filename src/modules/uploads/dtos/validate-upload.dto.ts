import { z } from "zod";

export const ValidateUploadDto = z.object({
    fileKey: z.string().min(1, "fileKey es requerido"),
    publicUrl: z.string().url("publicUrl debe ser una URL válida"),
});

export type ValidateUploadDto = z.infer<typeof ValidateUploadDto>;
