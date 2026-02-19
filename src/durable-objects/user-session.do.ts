import { DurableObject } from "cloudflare:workers";
import type { Env } from "./types";

/**
 * Per-WebSocket attachment persisted across hibernation.
 * Stored via ws.serializeAttachment() — max 2048 bytes.
 */
interface WSAttachment {
  userId: string;
  /** Thread IDs the user has joined (subscribedThreads). */
  subscribedThreads: string[];
}

/**
 * UserSession Durable Object — one instance per authenticated user.
 *
 * Responsibilities:
 * - Accept a single long-lived WebSocket connection for the user.
 * - Handle JOIN_THREAD / LEAVE_THREAD client events to subscribe /
 *   unsubscribe from ChatThread DOs.
 * - Receive inbound /send HTTP requests from ChatThread DOs and
 *   forward the payload to the open WebSocket connection(s).
 *
 * Uses the Hibernation WebSocket API so the DO can sleep when the
 * connection is idle, reducing billable duration.
 */
export class UserSession extends DurableObject<Env> {
  /**
   * Handles HTTP requests forwarded from the main Worker.
   *
   * Routes:
   *  GET  ...?upgrade=websocket  — upgrade and accept the WS connection
   *  POST .../send               — deliver an event payload to the WS client
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // ── WebSocket upgrade ──────────────────────────────────────────
    if (url.pathname.endsWith("/ws")) {
      const upgradeHeader = request.headers.get("Upgrade");
      if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
      }

      const userId = url.searchParams.get("userId");
      if (!userId) {
        return new Response("Missing userId query parameter", { status: 400 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      // acceptWebSocket enables hibernation (vs server.accept())
      this.ctx.acceptWebSocket(server);

      // Serialize initial state so it survives hibernation
      const attachment: WSAttachment = { userId, subscribedThreads: [] };
      server.serializeAttachment(attachment);

      return new Response(null, { status: 101, webSocket: client });
    }

    // ── Inbound event from ChatThread DO ──────────────────────────
    if (url.pathname.endsWith("/send")) {
      let payload: unknown;
      try {
        payload = await request.json();
      } catch {
        return new Response("Invalid JSON body", { status: 400 });
      }

      const serialized = JSON.stringify(payload);
      for (const ws of this.ctx.getWebSockets()) {
        try {
          ws.send(serialized);
        } catch {
          // Ignore send errors on individual connections (e.g., already closed)
        }
      }

      return new Response("ok", { status: 200 });
    }

    return new Response("Not found", { status: 404 });
  }

  // ── Hibernation event handlers ───────────────────────────────────

  /**
   * Called when the client sends a message over the WebSocket.
   *
   * Supported client → server message types:
   *  { type: "JOIN_THREAD",  threadId: string }
   *  { type: "LEAVE_THREAD", threadId: string }
   */
  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer
  ): Promise<void> {
    if (typeof message !== "string") {
      ws.send(JSON.stringify({ type: "ERROR", message: "Binary messages not supported" }));
      return;
    }

    let data: { type: string; threadId?: string };
    try {
      data = JSON.parse(message);
    } catch {
      ws.send(JSON.stringify({ type: "ERROR", message: "Invalid JSON" }));
      return;
    }

    const attachment = ws.deserializeAttachment() as WSAttachment;

    switch (data.type) {
      case "JOIN_THREAD": {
        if (!data.threadId) {
          ws.send(JSON.stringify({ type: "ERROR", message: "threadId is required" }));
          return;
        }

        if (!attachment.subscribedThreads.includes(data.threadId)) {
          // Register this user as a subscriber in the target ChatThread DO
          const threadDOId = this.env.ChatThread.idFromName(data.threadId);
          const threadStub = this.env.ChatThread.get(threadDOId);

          await threadStub.fetch("http://do/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: attachment.userId }),
          });

          attachment.subscribedThreads.push(data.threadId);
          ws.serializeAttachment(attachment);
        }

        ws.send(JSON.stringify({ type: "JOINED_THREAD", threadId: data.threadId }));
        break;
      }

      case "LEAVE_THREAD": {
        if (!data.threadId) {
          ws.send(JSON.stringify({ type: "ERROR", message: "threadId is required" }));
          return;
        }

        const idx = attachment.subscribedThreads.indexOf(data.threadId);
        if (idx !== -1) {
          const threadDOId = this.env.ChatThread.idFromName(data.threadId);
          const threadStub = this.env.ChatThread.get(threadDOId);

          await threadStub.fetch("http://do/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: attachment.userId }),
          });

          attachment.subscribedThreads.splice(idx, 1);
          ws.serializeAttachment(attachment);
        }

        ws.send(JSON.stringify({ type: "LEFT_THREAD", threadId: data.threadId }));
        break;
      }

      default:
        ws.send(
          JSON.stringify({ type: "ERROR", message: `Unknown message type: ${data.type}` })
        );
    }
  }

  /**
   * Called when the client closes the connection.
   * Unsubscribes from all joined threads so stale subscriber entries are cleaned up.
   */
  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    _wasClean: boolean
  ): Promise<void> {
    const attachment = ws.deserializeAttachment() as WSAttachment | null;

    if (attachment && attachment.subscribedThreads.length > 0) {
      await Promise.allSettled(
        attachment.subscribedThreads.map((threadId) => {
          const threadDOId = this.env.ChatThread.idFromName(threadId);
          const stub = this.env.ChatThread.get(threadDOId);
          return stub.fetch("http://do/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: attachment.userId }),
          });
        })
      );
    }

    ws.close(code, reason || "Connection closed");
  }

  /** Called when a WebSocket error occurs. */
  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    ws.close(1011, "Internal server error");
  }
}
