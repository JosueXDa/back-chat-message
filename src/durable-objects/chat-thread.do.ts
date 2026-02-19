import { DurableObject } from "cloudflare:workers";
import type { Env } from "./types";

/**
 * ChatThread Durable Object — one instance per thread (keyed by threadId).
 *
 * Responsibilities:
 * - Maintain a persistent set of subscriber userIds (stored in KV storage so
 *   it survives hibernation between requests).
 * - Broadcast incoming message events to every subscriber's UserSession DO,
 *   which in turn forwards them to the subscriber's open WebSocket.
 *
 * Routes:
 *  POST .../subscribe         — add a userId to the subscriber set
 *  POST .../unsubscribe       — remove a userId from the subscriber set
 *  POST .../broadcast-message — fan-out an event payload to all subscribers
 */
export class ChatThread extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // ── Subscribe ────────────────────────────────────────────────
    if (url.pathname.endsWith("/subscribe")) {
      let body: { userId: string };
      try {
        body = await request.json();
      } catch {
        return new Response("Invalid JSON body", { status: 400 });
      }

      const subscribers = await this.getSubscribers();
      subscribers.add(body.userId);
      await this.ctx.storage.put("subscribers", [...subscribers]);

      return new Response("subscribed", { status: 200 });
    }

    // ── Unsubscribe ───────────────────────────────────────────────
    if (url.pathname.endsWith("/unsubscribe")) {
      let body: { userId: string };
      try {
        body = await request.json();
      } catch {
        return new Response("Invalid JSON body", { status: 400 });
      }

      const subscribers = await this.getSubscribers();
      subscribers.delete(body.userId);
      await this.ctx.storage.put("subscribers", [...subscribers]);

      return new Response("unsubscribed", { status: 200 });
    }

    // ── Broadcast ─────────────────────────────────────────────────
    if (url.pathname.endsWith("/broadcast-message")) {
      let payload: unknown;
      try {
        payload = await request.json();
      } catch {
        return new Response("Invalid JSON body", { status: 400 });
      }

      const subscribers = await this.getSubscribers();

      if (subscribers.size > 0) {
        const serialized = JSON.stringify(payload);

        // Deliver to every subscriber's UserSession DO.
        // Using allSettled so a stale/missing subscriber doesn't abort delivery
        // to other active users.
        await Promise.allSettled(
          [...subscribers].map((userId) => {
            const userDOId = this.env.UserSession.idFromName(userId);
            const userStub = this.env.UserSession.get(userDOId);
            return userStub.fetch("http://do/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: serialized,
            });
          })
        );
      }

      return new Response("broadcast sent", { status: 200 });
    }

    return new Response("Not found", { status: 404 });
  }

  /** Returns the current subscriber set from durable KV storage. */
  private async getSubscribers(): Promise<Set<string>> {
    const stored = await this.ctx.storage.get<string[]>("subscribers");
    return new Set(stored ?? []);
  }
}
