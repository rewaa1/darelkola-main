import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { User, UserRole } from "@prisma/client";
import { actionError } from "@/lib/action-result";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch full user profile from database
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  return dbUser;
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
