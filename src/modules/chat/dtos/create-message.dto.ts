import { z } from "zod";

export const createMessageDto = z.object({
    threadId: z.string().uuid(),
    content: z.string().min(1),
    senderId: z.string(), // Usually inferred from session, but good to have in DTO for internal use
});

export type CreateMessageDto = z.infer<typeof createMessageDto>;
