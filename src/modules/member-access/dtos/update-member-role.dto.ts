import { z } from "zod";

export const updateMemberRoleDto = z.object({
    role: z.enum(['admin', 'moderator', 'member']),
});

export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleDto>;
