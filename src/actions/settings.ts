"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ===========================================
// Get All Users
// ===========================================

export async function getUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });
}

// ===========================================
// Delete User (Doctor-only)
// ===========================================

export async function deleteUser(userId: string) {
  // Verify the caller is a DOCTOR
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) throw new Error("Unauthorized");

  const caller = await prisma.user.findUnique({
    where: { id: authUser.id },
  });

  if (!caller || caller.role !== "DOCTOR") {
    throw new Error("Only doctors can delete user accounts");
  }

  // Cannot delete yourself
  if (userId === authUser.id) {
    throw new Error("Cannot delete your own account");
  }

  // Delete from database
  await prisma.user.delete({
    where: { id: userId },
  });

  // Delete from Supabase Auth (admin API via service role)
  // Note: This requires SUPABASE_SERVICE_ROLE_KEY in env
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    });
  }

  revalidatePath("/settings");
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

export async function deleteClinic(clinicId: string) {
  // Verify the caller is a DOCTOR
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) throw new Error("Unauthorized");

  const caller = await prisma.user.findUnique({
    where: { id: authUser.id },
  });

  if (!caller || caller.role !== "DOCTOR") {
    throw new Error("Only doctors can delete clinics");
  }

  await prisma.clinic.delete({
    where: { id: clinicId },
  });
  revalidatePath("/settings");
}
