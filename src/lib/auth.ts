import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { User, UserRole } from "@prisma/client";
import { actionError } from "@/lib/action-result";

/**
 * Fail at startup rather than at the login form.
 *
 * Better Auth derives `trustedOrigins` from `baseURL`. If BETTER_AUTH_URL is
 * missing, that list is EMPTY and every sign-in is rejected with
 * `Invalid origin: <the perfectly correct origin>` — a 403 that looks like a
 * CORS or cookie problem and says nothing about a missing variable. A loud
 * crash on boot costs minutes; that 403 costs an evening.
 */
function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Add it to .env (and to the Vercel project settings ` +
        `for deployments). Without it Better Auth trusts no origin and every ` +
        `login fails with "Invalid origin".`,
    );
  }
  return value;
}

const baseURL = requiredEnv("BETTER_AUTH_URL");

/**
 * Every origin the app may legitimately be served from.
 *
 * `baseURL` alone is not enough. Anyone reaching the site on a host that is not
 * byte-identical to it — www instead of the apex, or a Vercel preview URL — is
 * refused at sign-in with the same opaque "Invalid origin" 403.
 */
function buildTrustedOrigins(): string[] {
  const origins = [baseURL];

  // Vercel sets VERCEL_URL to the deployment's own hostname, so preview
  // deployments trust themselves. Same-origin by construction, not a widening.
  if (process.env.VERCEL_URL) origins.push(`https://${process.env.VERCEL_URL}`);

  // Anything else the site answers on — the www alias, a staging domain.
  // Comma-separated, full origins including scheme.
  const extra = process.env.BETTER_AUTH_TRUSTED_ORIGINS;
  if (extra) origins.push(...extra.split(",").map((o) => o.trim()).filter(Boolean));

  // Outside production, trust localhost on any port. A dev server that lands on
  // :3001 because :3000 was taken would otherwise reject every login, which
  // reads as a broken build rather than a busy port.
  if (process.env.NODE_ENV !== "production") {
    origins.push("http://localhost:*", "http://127.0.0.1:*");
  }

  return [...new Set(origins)];
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: requiredEnv("BETTER_AUTH_SECRET"),
  baseURL,
  trustedOrigins: buildTrustedOrigins(),

  emailAndPassword: {
    enabled: true,

    // There is no public signup: a doctor creates every account from Settings.
    // Without this, POST /api/auth/sign-up/email is an unauthenticated
    // account-creation endpoint sitting on the clinic's domain.
    disableSignUp: true,

    // Supabase (GoTrue) hashed with bcrypt; Better Auth's own default is
    // scrypt. The migration copies auth.users.encrypted_password across
    // byte-for-byte, so the verifier has to be the one that wrote them —
    // otherwise every account that existed before the move is locked out.
    // Cost 10 is what Supabase used, so new passwords match old ones.
    //
    // Do not "modernise" this to scrypt without first re-hashing every row in
    // auth_accounts, which cannot be done without each person's plaintext.
    // See prisma/sql/008_import_supabase_logins.sql.
    password: {
      hash: async (password) => bcrypt.hash(password, 10),
      verify: async ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },

  // `Session` is already the clinical encounter model in this schema, so Better
  // Auth's three tables are AuthSession / AuthAccount / AuthVerification. These
  // names must match prisma/schema.prisma.
  session: {
    modelName: "AuthSession",
    expiresIn: 60 * 60 * 24 * 7, // 7 days, matching the old Supabase setting
    updateAge: 60 * 60 * 24, // slide the expiry at most once a day
    // Deliberately no cookieCache: a cached session would keep a deleted or
    // revoked account working until the cache expired. Staff turnover here is
    // handled by a doctor deleting the user and expecting it to take effect.
  },
  account: { modelName: "AuthAccount" },
  verification: { modelName: "AuthVerification" },

  user: {
    // The existing `users` table, not a new one — its ids are the Supabase
    // UUIDs that pre_assessments.assistant_id and friends already reference.
    modelName: "User",
    additionalFields: {
      role: {
        type: ["DOCTOR", "RECEPTIONIST", "ASSISTANT"],
        required: false,
        defaultValue: "RECEPTIONIST", // matches the column default
        // Never settable from a request body. Role changes go through the
        // doctor-only server actions in src/actions/settings.ts.
        input: false,
      },
    },
  },
});

/**
 * The signed-in user's full profile row, or null.
 *
 * Reads the role from the database on every call rather than trusting the
 * session, so a role change (or a deletion) takes effect on the next request.
 */
export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  return prisma.user.findUnique({ where: { id: session.user.id } });
}

/**
 * Guard a server action to one of the given roles. A layout only protects the
 * pages under it; a server action is its own POST endpoint reachable directly,
 * so anything role-restricted must call this itself.
 *
 * Returns the caller so the action can attribute work to them (e.g. stamp a
 * pre-assessment with the assistant's id). Throws otherwise.
 */
export async function requireRole(...roles: UserRole[]): Promise<User> {
  const user = await getCurrentUser();
  if (!user) actionError("unauthorized");
  if (!roles.includes(user.role)) actionError("forbidden");
  return user;
}

/**
 * Hash a password with whatever hasher the auth instance is configured with,
 * so credentials written directly (Settings → create user / reset password)
 * are always verifiable by sign-in. Never hash with bcrypt here directly —
 * going through the context is what keeps the two in step.
 */
export async function hashPassword(password: string): Promise<string> {
  const ctx = await auth.$context;
  return ctx.password.hash(password);
}
