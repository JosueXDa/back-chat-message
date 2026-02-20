import { z } from "zod";

export const createMemberChannelDto = z.object({
    channelId: z.string(),
    userId: z.string(),
    role: z.enum(['admin', 'moderator', 'member']).default('member').optional(),
});

export type CreateMemberChannelDto = z.infer<typeof createMemberChannelDto>;
