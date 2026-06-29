import {
  PageHeaderSkeleton,
  StatsRowSkeleton,
  CardListSkeleton,
  PillsSkeleton,
} from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Clinic selector */}
      <PillsSkeleton count={4} />
      <PageHeaderSkeleton withAction />
      <StatsRowSkeleton count={4} />
      {/* Current patient panel */}
      <Skeleton className="h-28 w-full rounded-xl" />
      {/* Tabs */}
      <PillsSkeleton count={3} />
      <CardListSkeleton />
    </div>
  );
}
