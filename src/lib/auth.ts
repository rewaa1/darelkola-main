import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

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
