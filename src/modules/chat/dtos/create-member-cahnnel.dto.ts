import { z } from "zod";

export const createMemberChannelDto = z.object({
    channelId: z.string(),
    userId: z.string(),
});

export type CreateMemberChannelDto = z.infer<typeof createMemberChannelDto>;
