import type { DurableObjectNamespace } from "@cloudflare/workers-types";

/**
 * Cloudflare Workers environment bindings.
 * Used as the Bindings generic in Hono and as the Env generic in DurableObject.
 */
export interface Env {
  // Durable Object namespaces
  UserSession: DurableObjectNamespace;
  ChatThread: DurableObjectNamespace;

  // Database
  DATABASE_URL: string;

  // Auth
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;

  // CORS
  CORS_ORIGIN: string;

  // Cloudflare R2
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
  R2_PUBLIC_URL: string;
}
