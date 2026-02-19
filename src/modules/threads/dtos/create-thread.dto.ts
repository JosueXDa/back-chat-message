import { z } from "zod";

export const createThreadDto = z.object({
    channelId: z.string().uuid(),
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    createdBy: z.string(), // User ID
});

export type CreateThreadDto = z.infer<typeof createThreadDto>;
