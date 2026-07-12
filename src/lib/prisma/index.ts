import { PrismaClient } from "@prisma/client/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  pool: Pool;
};

function createPrismaClient() {
  // Runtime traffic must go through Supabase's transaction pooler (port 6543),
  // set as DATABASE_URL. DIRECT_URL (port 5432) is only for migrations run by
  // hand outside the app and must never be the runtime connection on Vercel.
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
    // On Vercel every warm function instance keeps its own pool, and the pooler
    // multiplexes them onto a few real Postgres backends — so each instance
    // needs only a handful of connections. Small enough that one instance can't
    // hog pooler client slots; > 1 so the parallel queries within a single
    // request (e.g. the dashboard's Promise.all of ~8 queries) don't serialise.
    max: 3,
    idleTimeoutMillis: 10000, // hand idle connections back to the pooler quickly
    connectionTimeoutMillis: 10000, // wait up to 10s for a connection, then fail
  });

  // Handle pool errors
  pool.on("error", (err) => {
    console.error("Unexpected database pool error:", err);
  });

  const adapter = new PrismaPg(pool);
  return { client: new PrismaClient({ adapter }), pool };
}

// Reuse connection in development, create fresh in production edge cases
if (!globalForPrisma.prisma) {
  const { client, pool } = createPrismaClient();
  globalForPrisma.prisma = client;
  globalForPrisma.pool = pool;
}

export const prisma = globalForPrisma.prisma;

// No beforeExit $disconnect/pool.end() here: on Vercel that handler can fire
// when the event loop drains between requests on a warm instance, closing the
// pool so the next request on the same instance hits a dead connection. Let the
// platform reap idle instances instead.
