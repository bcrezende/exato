import { useAuth } from "@/contexts/AuthContext";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import AnalystDashboard from "./AnalystDashboard";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import CoordinatorDashboard from "./CoordinatorDashboard";
import ManagerCoordinatorDashboard from "./ManagerCoordinatorDashboard";

export default function Dashboard() {
  const { role, identityReady } = useAuth();

  if (!identityReady) return <DashboardSkeleton />;

  if (role === "analyst") return <AnalystDashboard />;
  if (role === "admin") return <AdminDashboard />;
  if (role === "manager") return <ManagerDashboard />;
  if (role === "coordinator") return <CoordinatorDashboard />;
  return <ManagerCoordinatorDashboard />;
}
