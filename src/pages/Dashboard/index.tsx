import { useAuth } from "@/contexts/AuthContext";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import MyDayView from "@/components/dashboard/MyDayView";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import ManagerCoordinatorDashboard from "./ManagerCoordinatorDashboard";

export default function Dashboard() {
  const { role, identityReady } = useAuth();

  if (!identityReady) return <DashboardSkeleton />;

  if (role === "analyst") return <MyDayView />;
  if (role === "admin") return <AdminDashboard />;
  if (role === "manager") return <ManagerDashboard />;
  return <ManagerCoordinatorDashboard />;
}
