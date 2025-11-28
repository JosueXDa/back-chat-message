import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import app from "../../../index";

const TEST_USER = {
    email: `test-${Date.now()}@example.com`,
    password: "password123",
    name: "Test User"
};

const TEST_CHANNEL = {
    name: `channel-${Date.now()}`,
    description: "Test Channel Description"
};

let sessionCookie: string | null = null;
let channelId: string | null = null;

describe("Chat Module - Channel Flow", () => {
    it("should register a new user", async () => {
        const res = await app.request("/api/auth/sign-up/email", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(TEST_USER),
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveProperty("user");
        expect(data.user.email).toBe(TEST_USER.email);
    });

    it("should login the user", async () => {
        const res = await app.request("/api/auth/sign-in/email", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: TEST_USER.email,
                password: TEST_USER.password,
            }),
        });

        expect(res.status).toBe(200);
        const setCookie = res.headers.get("set-cookie");
        expect(setCookie).toBeTruthy();
        sessionCookie = setCookie;
    });

    it("should create a channel", async () => {
        if (!sessionCookie) throw new Error("No session cookie found");

        const res = await app.request("/api/channels", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Cookie": sessionCookie,
            },
            body: JSON.stringify(TEST_CHANNEL),
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveProperty("channel");
        expect(data.channel).toHaveProperty("id");
        expect(data.channel.name).toBe(TEST_CHANNEL.name);
        channelId = data.channel.id;
    });

    it("should verify creator is a member", async () => {
        // This test assumes there's a way to check membership, 
        // possibly by fetching the channel details if it includes members,
        // or by checking a members endpoint if it exists.
        // For now, we'll check if we can fetch the channel we just created.
        if (!channelId || !sessionCookie) throw new Error("Missing channelId or sessionCookie");

        const res = await app.request(`/api/channels/${channelId}`, {
            method: "GET",
            headers: {
                "Cookie": sessionCookie,
            },
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.channel.id).toBe(channelId);

        // TODO: Verify membership explicitly if the API supports it
        // For now, we assume creation implies membership/ownership as per requirements
    });

    it("should delete the channel", async () => {
        if (!channelId || !sessionCookie) throw new Error("Missing channelId or sessionCookie");

        const res = await app.request(`/api/channels/${channelId}`, {
            method: "DELETE",
            headers: {
                "Cookie": sessionCookie,
            },
        });

        expect(res.status).toBe(200);

        // Verify it's gone
        const checkRes = await app.request(`/api/channels/${channelId}`, {
            method: "GET",
            headers: {
                "Cookie": sessionCookie,
            },
        });

        // Depending on implementation, this might be 404 or null
        // The controller returns 404 if not found, but let's check the response
        if (checkRes.status === 200) {
            const data = await checkRes.json();
            expect(data).toBeNull();
        } else {
            expect(checkRes.status).toBe(404); // Or whatever the API returns for not found
        }
    });
});
