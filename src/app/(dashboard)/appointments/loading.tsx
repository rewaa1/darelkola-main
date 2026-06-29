import {
  PageHeaderSkeleton,
  FiltersBarSkeleton,
  StatsRowSkeleton,
  DataTableSkeleton,
  CardListSkeleton,
} from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeaderSkeleton />
      <FiltersBarSkeleton />
      <StatsRowSkeleton count={1} />
      <div className="md:hidden">
        <CardListSkeleton />
      </div>
      <div className="hidden md:block">
        <DataTableSkeleton columns={5} />
      </div>
    </div>
  );
}
