"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdminFetch } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";
import {
  type ActionResult,
  actionError,
  runAction,
} from "@/lib/action-result";

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
    // Verify the caller is a DOCTOR
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) actionError("unauthorized");

    const caller = await prisma.user.findUnique({
      where: { id: authUser.id },
    });

    if (!caller || caller.role !== "DOCTOR") actionError("doctorsOnly");

    // Create the login in Supabase Auth. The metadata is informational only —
    // this database has no `handle_new_user` trigger, so the `users` row that
    // getCurrentUser() depends on is written below, by us.
    const res = await supabaseAdminFetch("/auth/v1/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { name: data.name, role: data.role },
      }),
    });

    if (!res.ok) actionError("userCreateFailed");

    const createdUser = (await res.json().catch(() => ({}))) as { id?: string };
    if (!createdUser.id) actionError("userCreateFailed");

    // Mirror the account into `users`. Upsert rather than create, so this keeps
    // working if a handle_new_user trigger is ever added.
    try {
      await prisma.user.upsert({
        where: { id: createdUser.id },
        update: { email: data.email, name: data.name, role: data.role },
        create: {
          id: createdUser.id,
          email: data.email,
          name: data.name,
          role: data.role,
        },
      });
    } catch {
      // Roll the login back. A login with no `users` row authenticates fine but
      // resolves to no profile, stranding that person in a redirect loop at
      // /login with nothing left to repair from the UI.
      await supabaseAdminFetch(`/auth/v1/admin/users/${createdUser.id}`, {
        method: "DELETE",
      }).catch(() => {});
      actionError("userCreateFailed");
    }

    revalidatePath("/settings");
  });
}

// ===========================================
// Delete User (Doctor-only)
// ===========================================

export async function deleteUser(userId: string): Promise<ActionResult> {
  return runAction(async () => {
    // Verify the caller is a DOCTOR
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) actionError("unauthorized");

    const caller = await prisma.user.findUnique({
      where: { id: authUser.id },
    });

    if (!caller || caller.role !== "DOCTOR") actionError("doctorsOnly");

    // Cannot delete yourself
    if (userId === authUser.id) actionError("cannotDeleteSelf");

    // Revoke the login first. If this fails, the account still works and the
    // `users` row is intact — nothing is half-deleted. Doing it the other way
    // round strands a login that can authenticate but has no `users` row, which
    // leaves that person stuck in a redirect loop with no way to fix it.
    const res = await supabaseAdminFetch(`/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
    });

    // 404 means the auth account was already gone; the row still needs clearing.
    if (!res.ok && res.status !== 404) actionError("userDeleteFailed");

    // deleteMany, not delete: a cascade from auth.users may already have removed
    // the row, and that should not read as a failure.
    await prisma.user.deleteMany({ where: { id: userId } });

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
  revalidatePath("/settings");
}

// ===========================================
// Create Clinic
// ===========================================

export async function createClinic(data: { name: string; phone?: string }) {
  await prisma.clinic.create({ data });
  revalidatePath("/settings");
}

// ===========================================
// Delete Clinic (Doctor-only)
// ===========================================

export async function deleteClinic(clinicId: string): Promise<ActionResult> {
  return runAction(async () => {
    // Verify the caller is a DOCTOR
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) actionError("unauthorized");

    const caller = await prisma.user.findUnique({
      where: { id: authUser.id },
    });

    if (!caller || caller.role !== "DOCTOR") actionError("doctorsOnly");

    try {
      await prisma.clinic.delete({ where: { id: clinicId } });
    } catch {
      // Most likely a foreign-key violation: the clinic still has appointments.
      actionError("clinicDeleteFailed");
    }
    revalidatePath("/settings");
  });
}
