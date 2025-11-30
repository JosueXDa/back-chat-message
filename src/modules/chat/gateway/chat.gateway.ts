import { ServerWebSocket } from "bun";
import { ConnectionManager } from "./connection.manager";
import { MessageService } from "../services/message.service";
import { ChannelMemberService } from "../services/channel-member.service";
import { createMessageDto } from "../dtos/create-message.dto";
import { users } from "../../../db/schema/users.entity";

type User = typeof users.$inferSelect;

export class ChatGateway {
    constructor(
        private readonly connectionManager: ConnectionManager,
        private readonly messageService: MessageService,
        private readonly channelMemberService: ChannelMemberService
    ) { }

    handleConnection(ws: ServerWebSocket<{ user: User }>) {
        this.connectionManager.addConnection(ws.data.user.id, ws);
    }

    handleDisconnect(ws: ServerWebSocket<{ user: User }>) {
        this.connectionManager.removeConnection(ws.data.user.id);
    }

    async handleMessage(ws: ServerWebSocket<{ user: User }>, message: string | Buffer) {
        try {
            const parsedMessage = JSON.parse(message.toString());

            switch (parsedMessage.type) {
                case "SEND_MESSAGE":
                    await this.handleSendMessage(ws.data.user, parsedMessage.payload);
                    break;
                default:
                    console.warn("Unknown message type:", parsedMessage.type);
            }
        } catch (error) {
            console.error("Error handling message:", error);
            ws.send(JSON.stringify({ type: "ERROR", payload: "Invalid message format" }));
        }
    }

    private async handleSendMessage(user: User, payload: any) {
        // Validate payload
        const validation = createMessageDto.safeParse({ ...payload, senderId: user.id });

        if (!validation.success) {
            console.error("Validation error:", validation.error);
            return;
        }

        const data = validation.data;

        // Verify user is member of channel (Optional security check)
        // const members = await this.channelMemberService.getMembersByChannelId(data.channelId);
        // const isMember = members.some(m => m.member.userId === user.id);
        // if (!isMember) return;

        // Save message
        const savedMessage = await this.messageService.createMessage(data);

        // Broadcast to channel members
        const members = await this.channelMemberService.getMembersByChannelId(data.channelId);

        const response = {
            type: "NEW_MESSAGE",
            payload: savedMessage
        };

        const responseString = JSON.stringify(response);

        members.forEach(member => {
            const memberWs = this.connectionManager.getConnection(member.member.userId);
            if (memberWs && memberWs.readyState === 1) { // 1 = Open
                memberWs.send(responseString);
            }
        });
    }
}
