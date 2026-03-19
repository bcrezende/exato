import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header + Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-7 w-28 rounded-md" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </div>

      {/* Inline Filters */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-[180px] rounded-md" />
        <Skeleton className="h-8 w-[180px] rounded-md" />
      </div>

      {/* Team Summary */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-1 pt-3 px-4">
              <Skeleton className="h-3 w-20" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <Skeleton className="h-6 w-10 mb-1" />
              <Skeleton className="h-2.5 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Risk Radar */}
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Delay KPIs */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress + Critical */}
      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-8 w-full rounded-md" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div>
        <Skeleton className="h-10 w-full max-w-md rounded-md mb-4" />
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
