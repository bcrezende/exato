import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AcceptInvite from "./pages/AcceptInvite";
import NotFound from "./pages/NotFound";

// Lazy-loaded routes
const Dashboard = lazy(() => import("./pages/Dashboard/index"));
const Tasks = lazy(() => import("./pages/Tasks"));
const MyDayView = lazy(() => import("./components/dashboard/MyDayView"));
const Team = lazy(() => import("./pages/Team"));
const Settings = lazy(() => import("./pages/Settings"));
const Analysis = lazy(() => import("./pages/Analysis"));
const TeamMonitoring = lazy(() => import("./pages/TeamMonitoring"));
const AnalystDetail = lazy(() => import("./pages/AnalystDetail"));
const Presentation = lazy(() => import("./pages/Presentation"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const EmailMonitor = lazy(() => import("./pages/EmailMonitor"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const AuditDashboard = lazy(() => import("./pages/Dashboard/AuditDashboard"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 min cache
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    },
  },
});

const PageLoader = () => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />
            <Route path="/unsubscribe" element={<Suspense fallback={<PageLoader />}><Unsubscribe /></Suspense>} />
            <Route path="/presentation" element={<Suspense fallback={<PageLoader />}><Presentation /></Suspense>} />
            
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
              <Route path="/tasks" element={<Suspense fallback={<PageLoader />}><Tasks /></Suspense>} />
              <Route path="/my-day" element={<Suspense fallback={<PageLoader />}><MyDayView /></Suspense>} />
              <Route path="/team" element={<ProtectedRoute allowedRoles={["admin", "manager", "coordinator"]}><Suspense fallback={<PageLoader />}><Team /></Suspense></ProtectedRoute>} />
              <Route path="/team/monitoring" element={<ProtectedRoute allowedRoles={["admin", "manager", "coordinator"]}><Suspense fallback={<PageLoader />}><TeamMonitoring /></Suspense></ProtectedRoute>} />
              <Route path="/team/monitoring/:userId" element={<ProtectedRoute allowedRoles={["admin", "manager", "coordinator"]}><Suspense fallback={<PageLoader />}><AnalystDetail /></Suspense></ProtectedRoute>} />
              <Route path="/analysis" element={<ProtectedRoute allowedRoles={["admin", "manager", "coordinator"]}><Suspense fallback={<PageLoader />}><Analysis /></Suspense></ProtectedRoute>} />
              <Route path="/settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
              <Route path="/email-monitor" element={<Suspense fallback={<PageLoader />}><EmailMonitor /></Suspense>} />
              <Route path="/audit-log" element={<Suspense fallback={<PageLoader />}><AuditLog /></Suspense>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
