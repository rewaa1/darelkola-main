import { PrismaClient } from "@prisma/client/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  pool: Pool;
};

function createPrismaClient() {
  // Production-safe pool configuration
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 10000, // Timeout for acquiring a connection
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

// Graceful shutdown for production
if (typeof process !== "undefined") {
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
    await globalForPrisma.pool?.end();
  });
}
