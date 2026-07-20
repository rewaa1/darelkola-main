import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// Clinics are read on nearly every page (queue, appointments, settings, patient
// profile, assistant) and change almost never — the textbook cross-request
// cache. The list is held until a clinic write bumps this tag (see the write
// actions in actions/settings.ts, which call revalidateTag). The revalidate
// window is a safety net: if a write path is ever missed, a stale list still
// self-heals within the hour rather than sticking forever.
export const CLINICS_CACHE_TAG = "clinics";

export const getCachedClinics = unstable_cache(
  () => prisma.clinic.findMany({ orderBy: { name: "asc" } }),
  ["clinics:all"],
  { tags: [CLINICS_CACHE_TAG], revalidate: 3600 },
);
