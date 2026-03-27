import { LayoutDashboard, ListTodo, Users, Settings, LogOut, BrainCircuit, UsersRound, Sun, Moon, Mail, Shield, ClipboardCheck, MonitorDot, ChevronDown } from "lucide-react";
import logoWhite from "@/assets/logo-white.png";
import logoIcon from "@/assets/logo-icon.png";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const mainItems = [
  { title: "Tarefas", url: "/tasks", icon: ListTodo },
];

const dashboardSubItems = [
  { title: "Monitoramento", url: "/dashboard", icon: MonitorDot },
  { title: "Auditoria", url: "/dashboard/audit", icon: ClipboardCheck, roles: ["admin", "manager", "coordinator"] as string[] },
];

const managementItems = [
  { title: "Minha Equipe", url: "/team/monitoring", icon: UsersRound },
  { title: "Equipe & Setores", url: "/team", icon: Users },
  { title: "Análise IA", url: "/analysis", icon: BrainCircuit },
];

const bottomItems = [
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { profile, role, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const isActive = (path: string) => location.pathname === path;
  const isDashboardActive = location.pathname.startsWith("/dashboard");
  const initials = profile?.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "U";

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="relative flex items-center justify-start">
          <img
            src={logoWhite}
            alt="Exato"
            className={`h-14 w-auto transition-opacity duration-300 ease-in-out ${
              collapsed ? "opacity-0 absolute" : "opacity-100"
            }`}
          />
          <img
            src={logoIcon}
            alt="Exato"
            className={`h-8 w-8 object-contain transition-opacity duration-300 ease-in-out ${
              collapsed ? "opacity-100" : "opacity-0 absolute"
            }`}
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Dashboard collapsible group */}
              <Collapsible defaultOpen={isDashboardActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Dashboard" className={`hover-scale-subtle ${isDashboardActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}`}>
                      <LayoutDashboard className="h-4 w-4" />
                      {!collapsed && <span>Dashboard</span>}
                      {!collapsed && <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  {!collapsed && (
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {dashboardSubItems
                          .filter((item) => !item.roles || (role && item.roles.includes(role)))
                          .map((item) => (
                            <SidebarMenuSubItem key={item.title}>
                              <SidebarMenuSubButton asChild isActive={isActive(item.url)}>
                                <NavLink to={item.url} end activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                                  <item.icon className="h-3.5 w-3.5" />
                                  <span>{item.title}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  )}
                </SidebarMenuItem>
              </Collapsible>

              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title} className="hover-scale-subtle">
                    <NavLink to={item.url} end activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(role === "admin" || role === "manager" || role === "coordinator") && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50">Gestão</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managementItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title} className="hover-scale-subtle">
                      <NavLink to={item.url} end activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {profile?.is_master && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50">Master</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/email-monitor")} tooltip="Monitorar Emails" className="hover-scale-subtle">
                    <NavLink to="/email-monitor" end activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                      <Mail className="h-4 w-4" />
                      {!collapsed && <span>Monitorar Emails</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/audit-log")} tooltip="Auditoria" className="hover-scale-subtle">
                    <NavLink to="/audit-log" end activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                      <Shield className="h-4 w-4" />
                      {!collapsed && <span>Auditoria</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title} className="hover-scale-subtle">
                    <NavLink to={item.url} end activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name || "Avatar"} />}
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-medium text-sidebar-foreground">{profile?.full_name || "Usuário"}</span>
              <span className="truncate text-xs text-sidebar-foreground/60 capitalize">{role === "admin" ? "Administrador" : role === "manager" ? "Gerente" : role === "coordinator" ? "Coordenador" : role === "analyst" ? "Analista" : ""}</span>
            </div>
          )}
          {!collapsed && (
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-sidebar-foreground/60 hover:text-sidebar-foreground h-8 w-8"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              >
                {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground/60 hover:text-sidebar-foreground h-8 w-8" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
