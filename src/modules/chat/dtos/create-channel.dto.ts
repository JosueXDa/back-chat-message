import { z } from "zod";

const memberIdsSchema = z
    .array(z.string().min(1, "member id is required"))
    .nonempty("Provide at least one member")
    .refine((ids) => new Set(ids).size === ids.length, {
        message: "memberIds must be unique",
    });

export const createChannelSchema = z.object({
    name: z.string().min(1, "name is required").max(100, "name must have at most 100 characters"),
    description: z.string().max(500).optional().nullable(),
    isPrivate: z.boolean().optional().default(false),
    imageUrl: z.string().url("imageUrl must be a valid URL").optional(),
    category: z.string().optional().default("General"),
    memberIds: memberIdsSchema.optional(),
    ownerId: z.string().optional(),
});

export type CreateChannelDto = z.infer<typeof createChannelSchema>;

export type MemberIdsDto = z.infer<typeof memberIdsSchema>;