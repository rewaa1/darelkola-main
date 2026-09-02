"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, hashPassword } from "@/lib/auth";
import { revalidatePath, updateTag } from "next/cache";
import { UserRole } from "@prisma/client";
import { CLINICS_CACHE_TAG } from "@/lib/clinics";
import {
  type ActionResult,
  actionError,
  runAction,
} from "@/lib/action-result";

// Better Auth's own default. Enforced here too, because these actions write the
// credential row directly rather than going through the sign-up endpoint.
const MIN_PASSWORD_LENGTH = 8;

// Better Auth 1.7 scopes an account by (issuer, accountId) rather than by
// providerId, so that an OAuth provider id can never collide with an internal
// login. Password accounts carry this synthetic issuer, and sign-in matches on
// it exactly — a credential written without it is never found, and the person
// is told "invalid password" with nothing to indicate why.
const CREDENTIAL_ISSUER = "local:credential";

// ===========================================
// Get All Users
// ===========================================

export async function getUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });
}

// ===========================================
// Create User (Doctor-only)
// ===========================================

export async function createUser(data: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}): Promise<ActionResult> {
  return runAction(async () => {
    await requireRole("DOCTOR");

    if (data.password.length < MIN_PASSWORD_LENGTH) {
      actionError("passwordTooShort");
    }

    // Hash through the auth context, never bcrypt directly, so the credential
    // is always readable by whatever hasher sign-in is configured with.
    const passwordHash = await hashPassword(data.password);
    const id = crypto.randomUUID();

    // The login and the profile are two rows in one database now, so this is a
    // single transaction. Under Supabase Auth they lived in different systems
    // and this function had to create the account over HTTP, mirror it here,
    // and issue a compensating DELETE if the mirror failed — a half-created
    // user could authenticate but resolve to no profile, stranding that person
    // in a redirect loop at /login. That failure mode is now impossible.
    try {
      await prisma.$transaction(async (tx) => {
        await tx.user.create({
          data: {
            id,
            email: data.email,
            name: data.name,
            role: data.role,
            // Internal accounts, created by a doctor who already knows the
            // person. There is no mail server and nothing to confirm.
            emailVerified: true,
          },
        });

        await tx.authAccount.create({
          data: {
            id: crypto.randomUUID(),
            // For providerId "credential" Better Auth expects accountId to be
            // the user's own id.
            accountId: id,
            providerId: "credential",
            issuer: CREDENTIAL_ISSUER,
            userId: id,
            password: passwordHash,
          },
        });
      });
    } catch (error) {
      // users.email is UNIQUE — by far the likeliest failure, and the one the
      // doctor can actually act on.
      if (
        typeof error === "object" &&
        error !== null &&
        (error as { code?: string }).code === "P2002"
      ) {
        actionError("emailInUse");
      }
      throw error;
    }

    revalidatePath("/settings");
  });
}

// ===========================================
// Reset a User's Password (Doctor-only)
// ===========================================

/**
 * Replaces the forgot-password-by-email flow, which this app never actually
 * had: it linked to a /reset-password page that did not exist, and Better Auth
 * would need a mail provider this project does not have. A doctor creates
 * every account by hand, so a doctor resets it by hand too.
 */
export async function resetUserPassword(
  userId: string,
  newPassword: string,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireRole("DOCTOR");

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      actionError("passwordTooShort");
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      const account = await tx.authAccount.findUnique({
        where: {
          issuer_accountId: { issuer: CREDENTIAL_ISSUER, accountId: userId },
        },
      });

      if (account) {
        await tx.authAccount.update({
          where: { id: account.id },
          data: { password: passwordHash },
        });
      } else {
        // A users row that predates the credential import, or one whose account
        // was somehow lost. Give it a credential rather than failing — the
        // alternative is a profile nobody can ever sign in to.
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) actionError("userNotFound");

        await tx.authAccount.create({
          data: {
            id: crypto.randomUUID(),
            accountId: userId,
            providerId: "credential",
            issuer: CREDENTIAL_ISSUER,
            userId,
            password: passwordHash,
          },
        });
      }

      // Force every device holding the old password's session back to /login.
      // A reset that leaves the old sessions alive is not a reset.
      await tx.authSession.deleteMany({ where: { userId } });
    });

    revalidatePath("/settings");
  });
}

// ===========================================
// Delete User (Doctor-only)
// ===========================================

export async function deleteUser(userId: string): Promise<ActionResult> {
  return runAction(async () => {
    const caller = await requireRole("DOCTOR");

    // Cannot delete yourself
    if (userId === caller.id) actionError("cannotDeleteSelf");

    // ON DELETE CASCADE takes the credential and every active session with it,
    // so there is no window where a revoked account still authenticates.
    // deleteMany, not delete: a row that is already gone is not a failure.
    const { count } = await prisma.user.deleteMany({ where: { id: userId } });
    if (count === 0) actionError("userDeleteFailed");

    revalidatePath("/settings");
  });
}

// ===========================================
// Update Clinic
// ===========================================

export async function updateClinic(
  clinicId: string,
  data: { name?: string; phone?: string },
) {
  await prisma.clinic.update({
    where: { id: clinicId },
    data,
  });
  // Purge the cross-request clinics cache (src/lib/clinics.ts). updateTag is the
  // Server-Action-side invalidation: immediate expiry, read-your-own-writes.
  updateTag(CLINICS_CACHE_TAG);
  revalidatePath("/settings");
}

// ===========================================
// Create Clinic
// ===========================================

export async function createClinic(data: { name: string; phone?: string }) {
  await prisma.clinic.create({ data });
  updateTag(CLINICS_CACHE_TAG);
  revalidatePath("/settings");
}

// ===========================================
// Delete Clinic (Doctor-only)
// ===========================================

export async function deleteClinic(clinicId: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireRole("DOCTOR");

    try {
      await prisma.clinic.delete({ where: { id: clinicId } });
    } catch {
      // Most likely a foreign-key violation: the clinic still has appointments.
      actionError("clinicDeleteFailed");
    }
    updateTag(CLINICS_CACHE_TAG);
    revalidatePath("/settings");
  });
}
