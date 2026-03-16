import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { metrics, filters } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um analista de produtividade empresarial especializado. Gere análises detalhadas e acionáveis em português brasileiro.

Regras:
- Use markdown para formatar a resposta (títulos, listas, negrito)
- Seja direto e objetivo
- Identifique padrões, problemas e oportunidades
- Dê recomendações concretas e específicas
- Use emojis para tornar a leitura mais agradável
- Estruture em seções: Resumo Executivo, Pontos de Atenção, Destaques Positivos, Recomendações`;

    const periodLabel = filters.periodLabel || "Período não especificado";
    const sectorLabel = filters.sectorName || "Todos os setores";
    const employeeLabel = filters.employeeName || "Todos os funcionários";

    const userPrompt = `Analise os seguintes dados de performance:

**Filtros aplicados:**
- Período: ${periodLabel}
- Setor: ${sectorLabel}
- Funcionário: ${employeeLabel}

**Métricas:**
- Total de tarefas: ${metrics.totalTasks}
- Concluídas: ${metrics.completed}
- Pendentes: ${metrics.pending}
- Em andamento: ${metrics.inProgress}
- Atrasadas: ${metrics.overdue}
- Taxa de conclusão: ${metrics.completionRate}%
- Taxa de atraso: ${metrics.delayRate}%
- Tempo médio de execução: ${metrics.avgExecutionMinutes} minutos

**Distribuição por prioridade:**
- Alta: ${metrics.highPriority}
- Média: ${metrics.mediumPriority}
- Baixa: ${metrics.lowPriority}

${metrics.topSlowTasks?.length > 0 ? `**Top 3 tarefas mais demoradas:**\n${metrics.topSlowTasks.map((t: any, i: number) => `${i + 1}. "${t.title}" — ${t.minutes} min`).join("\n")}` : ""}

Gere uma análise completa e detalhada com base nesses dados.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao gerar análise." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "Não foi possível gerar a análise.";

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
