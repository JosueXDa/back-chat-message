import { z } from "zod";
import { createChannelSchema } from "./create-channel.dto";

const updateBaseSchema = createChannelSchema.partial();

export const updateChannelSchema = updateBaseSchema.refine(
    (data: z.infer<typeof updateBaseSchema>) => Object.values(data).some((value) => value !== undefined),
    {
        message: "Provide at least one property to update",
    },
);

export type UpdateChannelDto = z.infer<typeof updateChannelSchema>;