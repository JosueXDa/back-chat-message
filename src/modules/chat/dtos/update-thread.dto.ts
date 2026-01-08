import { z } from "zod";

export const updateThreadDto = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    isArchived: z.boolean().optional(),
});

export type UpdateThreadDto = z.infer<typeof updateThreadDto>;
