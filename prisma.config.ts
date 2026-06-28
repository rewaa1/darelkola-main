// prisma.config.ts for Prisma 7
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // DIRECT_URL for migrations (bypasses PgBouncer)
    url: process.env["DIRECT_URL"],
  },
});
