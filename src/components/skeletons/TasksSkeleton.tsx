import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function TasksSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="flex flex-wrap gap-3 p-4">
          <Skeleton className="h-9 w-[200px]" />
          <Skeleton className="h-9 w-[140px]" />
          <Skeleton className="h-9 w-[140px]" />
          <Skeleton className="h-9 w-[140px]" />
        </CardContent>
      </Card>

      {/* Kanban columns */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
              <Skeleton className="h-2.5 w-2.5 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="ml-auto h-5 w-6 rounded-full" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 2 + (i % 2) }).map((_, j) => (
                <Card key={j}>
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-4 w-16 rounded-full" />
                      <Skeleton className="h-4 w-14 rounded-full" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
