import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  BarChart3,
  AlertTriangle,
  Lightbulb,
  LayoutDashboard,
  KanbanSquare,
  Users,
  BrainCircuit,
  ShieldCheck,
  Sparkles,
  Rocket,
  CheckCircle2,
  Clock,
  TrendingUp,
  Eye,
  Calendar,
  Import,
  RefreshCw,
  Trophy,
  Activity,
  UserCheck,
  MessageSquare,
  History,
  Lock,
  Database,
  FileText,
  Bell,
  Palette,
  Info,
  Sun,
  Moon,
} from "lucide-react";
import logoDark from "@/assets/logo-dark.png";
import logoWhite from "@/assets/logo-white.png";

const SLIDE_W = 1920;
const SLIDE_H = 1080;

/* ───── individual slides ───── */

function SlideCover() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-[hsl(222,47%,11%)] text-white px-20">
      <img src={logoWhite} alt="Exato" className="h-28 mb-10 animate-fade-in" />
      <h1 className="text-[72px] font-bold font-['Space_Grotesk'] leading-tight text-center mb-6">
        Gestão de tarefas inteligente
      </h1>
      <p className="text-[32px] text-white/70 text-center max-w-[1200px]">
        Para equipes que entregam resultados
      </p>
      <div className="absolute bottom-16 flex items-center gap-2 text-white/40 text-[20px]">
        <ChevronRight className="w-5 h-5" /> Use as setas para navegar
      </div>
    </div>
  );
}

function SlideProblema() {
  const items = [
    { icon: Eye, title: "Falta de visibilidade", desc: "Gestores não enxergam o que cada membro da equipe está fazendo em tempo real" },
    { icon: Clock, title: "Atrasos não rastreados", desc: "Sem registro de quando tarefas iniciam ou terminam com atraso — decisões no escuro" },
    { icon: AlertTriangle, title: "Gestão manual", desc: "Planilhas, e-mails e reuniões improdutivas substituem uma plataforma centralizada" },
  ];
  return (
    <div className="flex flex-col h-full bg-white text-[hsl(222,47%,11%)] px-28 py-24">
      <p className="text-[22px] font-semibold text-[hsl(221,83%,53%)] uppercase tracking-widest mb-4">O Problema</p>
      <h2 className="text-[56px] font-bold font-['Space_Grotesk'] leading-tight mb-16">
        Equipes perdem produtividade<br />sem as ferramentas certas
      </h2>
      <div className="grid grid-cols-3 gap-12 flex-1">
        {items.map((it, i) => (
          <div key={i} className="flex flex-col items-start gap-5 p-10 rounded-2xl bg-[hsl(222,47%,97%)] border border-[hsl(222,47%,90%)]">
            <div className="w-16 h-16 rounded-xl bg-red-100 flex items-center justify-center">
              <it.icon className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-[28px] font-bold">{it.title}</h3>
            <p className="text-[20px] text-[hsl(222,47%,40%)] leading-relaxed">{it.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideSolucao() {
  const features = [
    { icon: LayoutDashboard, label: "Dashboards inteligentes" },
    { icon: KanbanSquare, label: "Kanban, Lista e Calendário" },
    { icon: Users, label: "Monitoramento de equipe" },
    { icon: BrainCircuit, label: "Análise com IA" },
    { icon: ShieldCheck, label: "Segurança por papel" },
    { icon: TrendingUp, label: "Métricas de atraso" },
  ];
  return (
    <div className="flex flex-col h-full bg-[hsl(222,47%,11%)] text-white px-28 py-24">
      <p className="text-[22px] font-semibold text-[hsl(221,83%,53%)] uppercase tracking-widest mb-4">A Solução</p>
      <h2 className="text-[56px] font-bold font-['Space_Grotesk'] leading-tight mb-6">
        Conheça o <span className="text-[hsl(221,83%,53%)]">Exato</span>
      </h2>
      <p className="text-[24px] text-white/60 mb-16 max-w-[900px]">
        Uma plataforma completa que centraliza tarefas, equipe e performance em um só lugar.
      </p>
      <div className="grid grid-cols-3 gap-8 flex-1">
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-5 p-8 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-14 h-14 rounded-xl bg-[hsl(221,83%,53%)]/20 flex items-center justify-center shrink-0">
              <f.icon className="w-7 h-7 text-[hsl(221,83%,53%)]" />
            </div>
            <span className="text-[24px] font-medium">{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideDashboards() {
  const roles = [
    { role: "Admin", desc: "Visão geral de toda a empresa, setores e taxa de atraso global", color: "bg-purple-500" },
    { role: "Gerente", desc: "Acompanha departamento, coordenadores e analistas vinculados", color: "bg-blue-500" },
    { role: "Coordenador", desc: "Monitora seus analistas, tarefas pessoais e produtividade", color: "bg-emerald-500" },
    { role: "Analista", desc: "Checklist do dia, progresso pessoal e gráfico de desempenho", color: "bg-amber-500" },
  ];
  return (
    <div className="flex flex-col h-full bg-white text-[hsl(222,47%,11%)] px-28 py-24">
      <p className="text-[22px] font-semibold text-[hsl(221,83%,53%)] uppercase tracking-widest mb-4">Dashboards</p>
      <h2 className="text-[56px] font-bold font-['Space_Grotesk'] leading-tight mb-16">
        Cada papel vê o que precisa
      </h2>
      <div className="grid grid-cols-2 gap-10 flex-1">
        {roles.map((r, i) => (
          <div key={i} className="flex gap-6 p-10 rounded-2xl bg-[hsl(222,47%,97%)] border border-[hsl(222,47%,90%)]">
            <div className={`w-3 rounded-full ${r.color} shrink-0`} />
            <div>
              <h3 className="text-[32px] font-bold mb-3">{r.role}</h3>
              <p className="text-[22px] text-[hsl(222,47%,40%)] leading-relaxed">{r.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideTarefas() {
  const modes = [
    { icon: KanbanSquare, title: "Kanban", desc: "Drag & drop entre colunas de status" },
    { icon: FileText, title: "Lista", desc: "Tabela ordenável com filtros avançados" },
    { icon: Calendar, title: "Calendário", desc: "Visualização mensal, semanal e diária" },
    { icon: Import, title: "Importação", desc: "Upload de planilha Excel para criar tarefas em massa" },
    { icon: RefreshCw, title: "Recorrência", desc: "Tarefas automáticas — diária, semanal, mensal, anual" },
    { icon: Clock, title: "Controle de tempo", desc: "Registro de início, pausa e conclusão" },
  ];
  return (
    <div className="flex flex-col h-full bg-[hsl(222,47%,11%)] text-white px-28 py-24">
      <p className="text-[22px] font-semibold text-[hsl(221,83%,53%)] uppercase tracking-widest mb-4">Gestão de Tarefas</p>
      <h2 className="text-[56px] font-bold font-['Space_Grotesk'] leading-tight mb-16">
        Múltiplas visões, um só objetivo
      </h2>
      <div className="grid grid-cols-3 gap-8 flex-1">
        {modes.map((m, i) => (
          <div key={i} className="flex flex-col gap-4 p-8 rounded-2xl bg-white/5 border border-white/10">
            <m.icon className="w-10 h-10 text-[hsl(221,83%,53%)]" />
            <h3 className="text-[26px] font-bold">{m.title}</h3>
            <p className="text-[18px] text-white/60 leading-relaxed">{m.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideMonitoramento() {
  const items = [
    { icon: Trophy, title: "Ranking de produtividade", desc: "Pontuação automática: +10 concluída, +5 no prazo, −3 atrasada" },
    { icon: Activity, title: "Status de atividade", desc: "Ativo, ocioso ou inativo — baseado nos logs de tempo" },
    { icon: UserCheck, title: "Detalhamento por analista", desc: "Tarefas em andamento, atrasadas e pendentes por pessoa" },
    { icon: BarChart3, title: "Métricas de atraso", desc: "% de início atrasado, conclusão atrasada e tendência 30 dias" },
  ];
  return (
    <div className="flex flex-col h-full bg-white text-[hsl(222,47%,11%)] px-28 py-24">
      <p className="text-[22px] font-semibold text-[hsl(221,83%,53%)] uppercase tracking-widest mb-4">Monitoramento</p>
      <h2 className="text-[56px] font-bold font-['Space_Grotesk'] leading-tight mb-16">
        Acompanhe sua equipe em tempo real
      </h2>
      <div className="grid grid-cols-2 gap-10 flex-1">
        {items.map((it, i) => (
          <div key={i} className="flex items-start gap-6 p-10 rounded-2xl bg-[hsl(222,47%,97%)] border border-[hsl(222,47%,90%)]">
            <div className="w-14 h-14 rounded-xl bg-[hsl(221,83%,53%)]/10 flex items-center justify-center shrink-0">
              <it.icon className="w-7 h-7 text-[hsl(221,83%,53%)]" />
            </div>
            <div>
              <h3 className="text-[28px] font-bold mb-2">{it.title}</h3>
              <p className="text-[20px] text-[hsl(222,47%,40%)] leading-relaxed">{it.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideIA() {
  return (
    <div className="flex flex-col h-full bg-[hsl(222,47%,11%)] text-white px-28 py-24">
      <p className="text-[22px] font-semibold text-[hsl(221,83%,53%)] uppercase tracking-widest mb-4">Inteligência Artificial</p>
      <h2 className="text-[56px] font-bold font-['Space_Grotesk'] leading-tight mb-16">
        Análises geradas por IA
      </h2>
      <div className="grid grid-cols-3 gap-10 flex-1">
        <div className="flex flex-col gap-5 p-10 rounded-2xl bg-white/5 border border-white/10">
          <MessageSquare className="w-10 h-10 text-[hsl(221,83%,53%)]" />
          <h3 className="text-[28px] font-bold">Insights automáticos</h3>
          <p className="text-[20px] text-white/60 leading-relaxed">
            Selecione período, setor e funcionário — a IA gera um relatório completo com pontos fortes e fracos.
          </p>
        </div>
        <div className="flex flex-col gap-5 p-10 rounded-2xl bg-white/5 border border-white/10">
          <History className="w-10 h-10 text-[hsl(221,83%,53%)]" />
          <h3 className="text-[28px] font-bold">Histórico de análises</h3>
          <p className="text-[20px] text-white/60 leading-relaxed">
            Todas as análises ficam salvas e podem ser revisitadas a qualquer momento.
          </p>
        </div>
        <div className="flex flex-col gap-5 p-10 rounded-2xl bg-white/5 border border-white/10">
          <Lightbulb className="w-10 h-10 text-[hsl(221,83%,53%)]" />
          <h3 className="text-[28px] font-bold">Recomendações</h3>
          <p className="text-[20px] text-white/60 leading-relaxed">
            Sugestões práticas de melhoria baseadas nos dados reais da sua equipe.
          </p>
        </div>
      </div>
    </div>
  );
}

function SlideSeguranca() {
  const items = [
    { icon: Lock, title: "RLS por papel", desc: "Cada usuário só acessa dados permitidos para seu papel — admin, gerente, coordenador ou analista." },
    { icon: Database, title: "Isolamento por empresa", desc: "Dados de cada empresa ficam completamente separados no banco de dados." },
    { icon: ShieldCheck, title: "Logging seguro", desc: "Registros de tempo e ações sem exposição de dados sensíveis." },
  ];
  return (
    <div className="flex flex-col h-full bg-white text-[hsl(222,47%,11%)] px-28 py-24">
      <p className="text-[22px] font-semibold text-[hsl(221,83%,53%)] uppercase tracking-widest mb-4">Segurança</p>
      <h2 className="text-[56px] font-bold font-['Space_Grotesk'] leading-tight mb-16">
        Segurança em cada camada
      </h2>
      <div className="grid grid-cols-3 gap-12 flex-1">
        {items.map((it, i) => (
          <div key={i} className="flex flex-col gap-5 p-10 rounded-2xl bg-[hsl(222,47%,97%)] border border-[hsl(222,47%,90%)]">
            <div className="w-16 h-16 rounded-xl bg-emerald-100 flex items-center justify-center">
              <it.icon className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-[28px] font-bold">{it.title}</h3>
            <p className="text-[20px] text-[hsl(222,47%,40%)] leading-relaxed">{it.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideDiferenciais() {
  const diffs = [
    { icon: Info, label: "Tooltips de fórmulas nos KPIs" },
    { icon: Bell, label: "Notificações em tempo real" },
    { icon: Users, label: "Convites por e-mail com link seguro" },
    { icon: Calendar, label: "Feriados configuráveis por empresa" },
    { icon: Sun, label: "Tema claro e escuro" },
    { icon: Sparkles, label: "Interface moderna e responsiva" },
  ];
  return (
    <div className="flex flex-col h-full bg-[hsl(222,47%,11%)] text-white px-28 py-24">
      <p className="text-[22px] font-semibold text-[hsl(221,83%,53%)] uppercase tracking-widest mb-4">Diferenciais</p>
      <h2 className="text-[56px] font-bold font-['Space_Grotesk'] leading-tight mb-16">
        Detalhes que fazem a diferença
      </h2>
      <div className="grid grid-cols-3 gap-8 flex-1">
        {diffs.map((d, i) => (
          <div key={i} className="flex items-center gap-5 p-8 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-12 h-12 rounded-xl bg-[hsl(221,83%,53%)]/20 flex items-center justify-center shrink-0">
              <d.icon className="w-6 h-6 text-[hsl(221,83%,53%)]" />
            </div>
            <span className="text-[24px] font-medium">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideCTA() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-[hsl(222,47%,11%)] text-white px-20">
      <img src={logoWhite} alt="Exato" className="h-20 mb-12" />
      <h2 className="text-[64px] font-bold font-['Space_Grotesk'] leading-tight text-center mb-6">
        Pronto para transformar<br />a gestão da sua equipe?
      </h2>
      <p className="text-[28px] text-white/60 text-center mb-16 max-w-[800px]">
        Comece agora com o Exato e tenha visibilidade total sobre tarefas, prazos e performance.
      </p>
      <div className="flex items-center gap-6">
        <a
          href="/register"
          className="px-12 py-5 rounded-xl bg-[hsl(221,83%,53%)] text-white text-[24px] font-semibold hover:opacity-90 transition-opacity"
        >
          Criar conta grátis
        </a>
        <a
          href="/login"
          className="px-12 py-5 rounded-xl border-2 border-white/20 text-white text-[24px] font-semibold hover:bg-white/5 transition-colors"
        >
          Fazer login
        </a>
      </div>
    </div>
  );
}

/* ───── slides array ───── */

const slides = [
  SlideCover,
  SlideProblema,
  SlideSolucao,
  SlideDashboards,
  SlideTarefas,
  SlideMonitoramento,
  SlideIA,
  SlideSeguranca,
  SlideDiferenciais,
  SlideCTA,
];

/* ───── main component ───── */

export default function Presentation() {
  const [current, setCurrent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);

  const prev = useCallback(() => setCurrent((c) => Math.max(0, c - 1)), []);
  const next = useCallback(() => setCurrent((c) => Math.min(slides.length - 1, c + 1)), []);

  /* keyboard navigation */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      if (e.key === "Escape" && isFullscreen) document.exitFullscreen?.();
      if (e.key === "f" || e.key === "F") {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, isFullscreen]);

  /* fullscreen listener */
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  /* scale computation */
  useEffect(() => {
    const compute = () => {
      const sx = window.innerWidth / SLIDE_W;
      const sy = window.innerHeight / SLIDE_H;
      setScale(Math.min(sx, sy));
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const SlideComponent = slides[current];

  return (
    <div className="fixed inset-0 bg-[hsl(222,47%,8%)] overflow-hidden select-none">
      {/* scaled slide */}
      <div
        className="absolute"
        style={{
          width: SLIDE_W,
          height: SLIDE_H,
          left: "50%",
          top: "50%",
          marginLeft: -(SLIDE_W / 2),
          marginTop: -(SLIDE_H / 2),
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <div className="w-full h-full rounded-lg overflow-hidden shadow-2xl">
          <SlideComponent />
        </div>
      </div>

      {/* nav arrows */}
      {current > 0 && (
        <button
          onClick={prev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {current < slides.length - 1 && (
        <button
          onClick={next}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center gap-4 px-6 py-3 bg-black/40 backdrop-blur-sm">
        {/* progress dots */}
        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                i === current ? "bg-[hsl(221,83%,53%)] scale-125" : "bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>

        <span className="text-white/50 text-sm ml-2">
          {current + 1} / {slides.length}
        </span>

        <div className="flex-1" />

        {/* fullscreen toggle */}
        <button
          onClick={toggleFullscreen}
          className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>

      {/* progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 z-30">
        <div
          className="h-full bg-[hsl(221,83%,53%)] transition-all duration-300"
          style={{ width: `${((current + 1) / slides.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
