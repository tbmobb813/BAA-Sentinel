import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma's CLI only auto-loads `.env` -- load `.env.local` on top (matching
// Next.js's own precedence) so `npx prisma ...` picks up the same file the
// README tells you to create. Both are optional here: `prisma generate`
// only needs the schema, not a live connection, so a missing/placeholder
// DATABASE_URL must not make `npm install`'s postinstall hook fail on a
// fresh clone -- only `migrate`/`db push`/actual queries need a real one,
// and those fail with an ordinary Postgres connection error when it's
// missing, which is a much clearer signal than a config-loading crash.
config({ path: ".env" });
config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://user:password@localhost:5432/baa_sentinel",
  },
});
