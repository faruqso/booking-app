import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shows immediately when navigating between dashboard tabs.
 * Gives instant feedback so the app doesn't feel stuck.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}
