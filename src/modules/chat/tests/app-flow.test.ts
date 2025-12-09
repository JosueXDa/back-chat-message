import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { app } from "../../../index";
import { ChatGateway } from "../gateway/chat.gateway";
import { ConnectionManager } from "../gateway/connection.manager";
import { MessageService } from "../services/message.service";
import { ChannelMemberService } from "../services/channel-member.service";
import { MessageRepository } from "../repositories/message.repository";
import { ChannelMemberRepository } from "../repositories/channel-member.repository";

// Setup Gateway for testing
const messageRepository = new MessageRepository();
const messageService = new MessageService(messageRepository);
const channelMemberRepository = new ChannelMemberRepository();
const channelMemberService = new ChannelMemberService(channelMemberRepository);
const connectionManager = new ConnectionManager();
const chatGateway = new ChatGateway(
    connectionManager,
    messageService,
    channelMemberService
);

const USER_A = {
    email: `user-a-${Date.now()}@example.com`,
    password: "password123",
    name: "User A"
};

const USER_B = {
    email: `user-b-${Date.now()}@example.com`,
    password: "password123",
    name: "User B"
};

const TEST_CHANNEL = {
    name: `channel-${Date.now()}`,
    description: "Test Channel for Flow"
};

let sessionCookieA: string | null = null;
let sessionCookieB: string | null = null;
let userIdA: string | null = null;
let userIdB: string | null = null;
let channelId: string | null = null;

describe("Full Application Flow", () => {
    // 1. Login (Register + Login) for User A
    it("should register and login User A", async () => {
        // Register
        const resReg = await app.request("/api/auth/sign-up/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(USER_A),
        });
        expect(resReg.status).toBe(200);
        const dataReg = await resReg.json();
        userIdA = dataReg.user.id;

        // Login
        const resLogin = await app.request("/api/auth/sign-in/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: USER_A.email, password: USER_A.password }),
        });
        expect(resLogin.status).toBe(200);
        sessionCookieA = resLogin.headers.get("set-cookie");
        expect(sessionCookieA).toBeTruthy();
    });

    // 2. Create Channel (User A)
    it("should create a channel by User A", async () => {
        if (!sessionCookieA) throw new Error("No session cookie for User A");

        const res = await app.request("/api/chats/channels", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Cookie": sessionCookieA,
            },
            body: JSON.stringify(TEST_CHANNEL),
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.channel).toHaveProperty("id");
        channelId = data.channel.id;
    });

    // 3. Login (Register + Login) for User B
    it("should register and login User B", async () => {
        // Register
        const resReg = await app.request("/api/auth/sign-up/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(USER_B),
        });
        expect(resReg.status).toBe(200);
        const dataReg = await resReg.json();
        userIdB = dataReg.user.id;

        // Login
        const resLogin = await app.request("/api/auth/sign-in/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: USER_B.email, password: USER_B.password }),
        });
        expect(resLogin.status).toBe(200);
        sessionCookieB = resLogin.headers.get("set-cookie");
        expect(sessionCookieB).toBeTruthy();
    });

    // 4. Subscribe to Channel (User B)
    it("should subscribe User B to the channel", async () => {
        if (!sessionCookieB || !channelId) throw new Error("Missing session B or channelId");

        const res = await app.request("/api/chats/members", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Cookie": sessionCookieB,
            },
            body: JSON.stringify({
                channelId: channelId,
                role: "member"
            }),
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveProperty("member");
        expect(data.member).toHaveProperty("channelId");
        expect(data.member.channelId).toBe(channelId);
        expect(data.member).toHaveProperty("userId");
        // Verify userId matches User B
        expect(data.member.userId).toBe(userIdB);
    });

    // 5. Send Message (User B)
    it("should send a message from User B to the channel", async () => {
        if (!userIdB || !channelId) throw new Error("Missing userIdB or channelId");

        // Mock WebSocket
        const mockWs = {
            data: {
                user: { id: userIdB, name: USER_B.name, email: USER_B.email }
            },
            send: (msg: string) => {
                // We can spy on this if we want to verify broadcast
                console.log("Mock WS sent:", msg);
            },
            readyState: 1 // Open
        };

        // Add connection to manager so it can receive broadcasts (optional for this test, but good for completeness)
        connectionManager.addConnection(userIdB, mockWs as any);

        const messagePayload = {
            type: "SEND_MESSAGE",
            payload: {
                content: "Hello World from User B",
                channelId: channelId
            }
        };

        // Simulate receiving a message from User B
        await chatGateway.handleMessage(mockWs as any, JSON.stringify(messagePayload));

        // Verify message was saved in DB
        // We can check via direct DB access or if there's an endpoint to get messages
        // Since there is no message endpoint, we'll check the repository directly
        const messages = await messageRepository.findByChannel(channelId);
        expect(messages).toHaveLength(1);
        expect(messages[0].content).toBe("Hello World from User B");
        expect(messages[0].senderId).toBe(userIdB);
    });
});
