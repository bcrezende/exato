import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { WhatsNewBell } from "@/components/WhatsNewBell";
import { ProfileCompletionBadge } from "@/components/ProfileCompletionBadge";
import { usePendingNotDone } from "@/hooks/usePendingNotDone";
import PendingNotDoneModal from "@/components/tasks/PendingNotDoneModal";

export function AppLayout() {
  const location = useLocation();
  const { notDoneTasks, showModal, resolveTask } = usePendingNotDone();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:px-6">
            <SidebarTrigger />
            <div className="ml-auto flex items-center gap-3">
              <ProfileCompletionBadge />
              <NotificationBell />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <div key={location.pathname} className="animate-page-enter">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <PendingNotDoneModal
        open={showModal}
        tasks={notDoneTasks}
        onResolve={resolveTask}
      />
    </SidebarProvider>
  );
}
