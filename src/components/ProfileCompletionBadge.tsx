import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

export function ProfileCompletionBadge() {
  const { profile, loading } = useAuth();

  if (loading || !profile) return null;

  const missing: string[] = [];
  if (!profile.full_name) missing.push("nome");
  if (!profile.phone) missing.push("telefone");
  if (!profile.position) missing.push("cargo");

  if (missing.length === 0) return null;

  return (
    <Link
      to="/settings"
      className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span className="hidden sm:inline">
        Complete seu cadastro: {missing.join(", ")}
      </span>
      <span className="sm:hidden">Completar cadastro</span>
    </Link>
  );
}
