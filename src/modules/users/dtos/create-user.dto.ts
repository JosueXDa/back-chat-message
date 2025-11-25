import { z } from "zod";

const baseProfileSchema = z.object({
    displayName: z.string().min(1, "displayName is required"),
    avatarUrl: z.string().url().optional().nullable(),
    bio: z.string().max(500).optional().nullable(),
    age: z.number().int().nonnegative().optional().nullable(),
    isOnline: z.boolean().optional(),
});

export const createUserSchema = z.object({
    id: z.string().min(1, "id is required"),
    email: z.string().email(),
    name: z.string().min(1, "name is required"),
    image: z.string().url().optional().nullable(),
    emailVerified: z.boolean().optional().default(false),
    profile: baseProfileSchema,
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type CreateProfileDto = CreateUserDto["profile"];
