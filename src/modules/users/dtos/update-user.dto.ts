import { z } from "zod";
import { createUserSchema } from "./create-user.dto";

const profileUpdateSchema = createUserSchema.shape.profile.partial();

const baseUpdateSchema = z.object({
    email: z.string().email().optional(),
    name: z.string().min(1).optional(),
    image: z.string().url().optional().nullable(),
    emailVerified: z.boolean().optional(),
    profile: profileUpdateSchema.optional(),
});

const hasProfileChanges = (profile?: z.infer<typeof profileUpdateSchema>) => {
    if (!profile) {
        return false;
    }

    return Object.values(profile).some((value) => value !== undefined);
};

export const updateUserSchema = baseUpdateSchema.refine(
    (data) => {
        const hasUserFields = ["email", "name", "image", "emailVerified"].some(
            (key) => data[key as keyof typeof data] !== undefined,
        );

        return hasUserFields || hasProfileChanges(data.profile);
    },
    {
        message: "Provide at least one property to update",
    },
);

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
