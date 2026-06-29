import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PillsSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Back link */}
      <Skeleton className="h-5 w-20" />

      {/* Patient header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Tabs */}
      <PillsSkeleton count={5} />

      {/* Tab content */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
