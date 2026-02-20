import { drizzle } from 'drizzle-orm/neon-http';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';

/**
 * Lazily-initialized Drizzle client (HTTP driver).
 *
 * Why neon-http?
 * Cloudflare Workers forbids sharing I/O objects (WebSocket connections, etc.)
 * between request handlers. The neon-serverless Pool driver uses WebSockets and
 * therefore triggers "Cannot perform I/O on behalf of a different request".
 * The neon-http driver is stateless (plain HTTPS fetch per query) and works
 * correctly as a singleton in CF Workers.
 *
 * Transactions: neon-http does NOT support Drizzle's db.transaction().
 * Use db.batch([...]) for atomic multi-statement operations instead.
 *
 * Why lazy?
 * Cloudflare Workers validates the Worker script at upload time by running
 * top-level (module-scoped) code. At that point, secrets/env vars (like
 * DATABASE_URL) are NOT yet injected — they only become available inside
 * request handlers. Calling drizzle() at module level therefore fails with:
 *   "Cannot read properties of undefined (reading 'query')"  [code: 10021]
 *
 * For local Bun dev, dotenv/config is imported in src/index.ts and populates
 * process.env before any request arrives, so the lazy init still works.
 */
let _db: NeonHttpDatabase | null = null;

function getOrCreate(): NeonHttpDatabase {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        'DATABASE_URL is not set. ' +
        'For local dev add it to .env; for CF Workers set it with: wrangler secret put DATABASE_URL'
      );
    }
    _db = drizzle(url);
  }
  return _db;
}

export const db = new Proxy({} as NeonHttpDatabase, {
  get(_, prop: string | symbol) {
    return Reflect.get(getOrCreate(), prop);
  },
});

