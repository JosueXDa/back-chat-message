import { z } from "zod";

const updateBaseSchema = z.object({
    name: z.string().min(1, "name is required").max(100, "name must have at most 100 characters").optional(),
    description: z.string().max(500).optional().nullable(),
    isPrivate: z.boolean().optional().default(false),
});

export const updateChannelSchema = updateBaseSchema.refine(
    (data: z.infer<typeof updateBaseSchema>) => Object.values(data).some((value) => value !== undefined),
    {
        message: "Provide at least one property to update",
    },
);

export type UpdateChannelDto = z.infer<typeof updateChannelSchema>;