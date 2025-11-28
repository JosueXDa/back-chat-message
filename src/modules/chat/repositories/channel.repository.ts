import { channels } from "../../../db/schema/channels.entity";
import { db } from "../../../db";
import { eq } from "drizzle-orm";
import { CreateChannelDto } from "../dtos/create-channel.dto";
import { UpdateChannelDto } from "../dtos/update-channel.dto";

export type ChannelRow = {
    channel: typeof channels.$inferSelect;
}

export class ChannelRepository {
    async create(data: CreateChannelDto): Promise<ChannelRow> {
        const [newChannel] = await db.insert(channels).values({
            name: data.name,
            description: data.description,
            isPrivate: data.isPrivate,
            ownerId: data.ownerId,
        }).returning(); //devuelve todo el objeto despues de insertar

        return { channel: newChannel };
    }

    async update(id: string, data: UpdateChannelDto): Promise<ChannelRow | undefined> {
        const updateData: Partial<typeof channels.$inferInsert> = {};

        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.isPrivate !== undefined) updateData.isPrivate = data.isPrivate;

        if (Object.keys(updateData).length === 0) {
            return this.findById(id);
        }

        const [updatedChannel] = await db
            .update(channels)
            .set(updateData)
            .where(eq(channels.id, id))
            .returning();

        if (!updatedChannel) return undefined;

        return { channel: updatedChannel };
    }

    async delete(id: string): Promise<ChannelRow | undefined> {
        const [deletedChannel] = await db
            .delete(channels)
            .where(eq(channels.id, id))
            .returning();

        if (!deletedChannel) return undefined;

        return { channel: deletedChannel };
    }

    async findById(id: string): Promise<ChannelRow | undefined> {
        const [result] = await db
            .select({ channel: channels })
            .from(channels)
            .where(eq(channels.id, id));

        return result;
    }

    async findAll(): Promise<ChannelRow[]> {
        return db
            .select({ channel: channels })
            .from(channels);
    }
}