import { z } from "zod";

const updateBaseSchema = z.object({
    name: z.string().min(1, "name is required").max(100, "name must have at most 100 characters").optional(),
    description: z.string().max(500).optional().nullable(),
    isPrivate: z.boolean().optional().default(false),
    imageUrl: z.string().url("imageUrl must be a valid URL").optional(),
    bannerUrl: z.string().url("bannerUrl must be a valid URL").optional().nullable(),
    category: z.string().min(1, "category is required").max(50, "category must have at most 50 characters").optional().default("General"),
});

export const updateChannelSchema = updateBaseSchema.refine(
    (data: z.infer<typeof updateBaseSchema>) => Object.values(data).some((value) => value !== undefined),
    {
        message: "Provide at least one property to update",
    },
);

export type UpdateChannelDto = z.infer<typeof updateChannelSchema>;