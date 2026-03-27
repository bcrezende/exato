import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const titleMap: Record<string, string> = {
  "/dashboard": "Dashboard | Exato",
  "/tasks": "Tarefas | Exato",
  "/my-day": "Meu Dia | Exato",
  "/team": "Equipe | Exato",
  "/team/monitoring": "Minha Equipe | Exato",
  "/analysis": "Análise IA | Exato",
  "/settings": "Configurações | Exato",
  "/email-monitor": "Monitorar Emails | Exato",
  "/audit-log": "Auditoria | Exato",
  "/login": "Login | Exato",
  "/register": "Cadastro | Exato",
  "/forgot-password": "Recuperar Senha | Exato",
  "/reset-password": "Nova Senha | Exato",
  "/presentation": "Apresentação | Exato",
};

export function useDocumentTitle() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;

    // Check exact match first
    if (titleMap[path]) {
      document.title = titleMap[path];
      return;
    }

    // Check dynamic routes
    if (path.startsWith("/team/monitoring/")) {
      document.title = "Detalhe Analista | Exato";
      return;
    }

    document.title = "Exato";
  }, [location.pathname]);
}
