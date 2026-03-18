import { lazy, Suspense, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import PodiumCard from "./PodiumCard";
import type { Tables } from "@/integrations/supabase/types";

const LazyPerformanceAnalytics = lazy(() => import("./PerformanceAnalytics"));

type Task = Tables<"tasks">;
type Profile = { id: string; full_name: string | null; department_id: string | null };

interface PerformanceTabsProps {
  tasks: Task[];
  timeLogs: { id: string; task_id: string; user_id: string; action: string; created_at: string }[];
  profiles: Profile[];
  departments: { id: string; name: string }[];
  selectedDepartment: string | null;
}

export default function PerformanceTabs({
  tasks,
  timeLogs,
  profiles,
  departments,
  selectedDepartment,
}: PerformanceTabsProps) {
  const [activeTab, setActiveTab] = useState("ranking");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="ranking">🏆 Ranking</TabsTrigger>
        <TabsTrigger value="analytics">📊 Analytics</TabsTrigger>
      </TabsList>
      <TabsContent value="ranking" className="mt-4">
        <PodiumCard
          tasks={tasks}
          timeLogs={timeLogs}
          profiles={profiles}
          departments={departments}
          selectedDepartment={selectedDepartment}
        />
      </TabsContent>
      <TabsContent value="analytics" className="mt-4">
        {activeTab === "analytics" && (
          <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
            <LazyPerformanceAnalytics
              tasks={tasks}
              timeLogs={timeLogs}
              departments={departments}
              selectedDepartment={selectedDepartment}
              profiles={profiles}
            />
          </Suspense>
        )}
      </TabsContent>
    </Tabs>
  );
}
