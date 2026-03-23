import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type AnalysisType = "productivity" | "bottlenecks" | "team" | "risks";

const analysisTypeLabels: Record<AnalysisType, string> = {
  productivity: "Produtividade",
  bottlenecks: "Gargalos",
  team: "Equipe",
  risks: "Riscos",
};

const analysisTypeInstructions: Record<AnalysisType, string> = {
  productivity: `Foque na PRODUTIVIDADE:
- Taxas de conclusão e eficiência geral
- Volume de tarefas entregues no prazo
- Tempo médio de execução e desvios de estimativa
- Otimização de processos e sugestões para aumentar throughput`,

  bottlenecks: `Foque nos GARGALOS e problemas:
- Tarefas mais demoradas e por que estão lentas
- Padrões de atraso recorrentes
- Desvios entre estimativa e tempo real
- Etapas do fluxo onde o trabalho trava
- Ações concretas para eliminar cada gargalo identificado`,

  team: `Foque na ANÁLISE DE EQUIPE:
- Distribuição de carga entre membros
- Comparativo de performance entre analistas (se dados disponíveis)
- Identificar quem está sobrecarregado ou subutilizado
- Sugestões de redistribuição de tarefas
- Pontos fortes e áreas de desenvolvimento de cada membro`,

  risks: `Foque na PREVISÃO DE RISCOS:
- Tendências que indicam problemas futuros
- Tarefas com alta probabilidade de atrasar
- Áreas com crescente acúmulo de pendências
- Impacto potencial de continuar no ritmo atual
- Plano de mitigação para cada risco identificado`,
};

function buildSystemPrompt(analysisType: AnalysisType, hasComparison: boolean): string {
  let prompt = `Você é um analista de produtividade empresarial especializado. Gere análises detalhadas e acionáveis em português brasileiro.

Regras:
- Use markdown para formatar a resposta (títulos, listas, negrito)
- Seja direto e objetivo
- Identifique padrões, problemas e oportunidades
- Dê recomendações concretas e específicas
- Use emojis para tornar a leitura mais agradável

${analysisTypeInstructions[analysisType]}

Estruture em seções: Resumo Executivo, Pontos de Atenção, Destaques Positivos, Recomendações`;

  if (hasComparison) {
    prompt += `

IMPORTANTE: Você receberá métricas de DOIS períodos (atual e anterior). 
Faça uma análise COMPARATIVA destacando:
- Evolução percentual de cada métrica principal
- Tendências de melhoria ou piora
- Use setas ↑↓ e percentuais para indicar variações
- Adicione uma seção "📊 Comparativo" antes das Recomendações`;
  }

  return prompt;
}

function buildMetricsText(metrics: any, label: string): string {
  let text = `**${label}:**
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
- Baixa: ${metrics.lowPriority}`;

  if (metrics.topSlowTasks?.length > 0) {
    text += `\n\n**Top 3 tarefas mais demoradas:**\n${metrics.topSlowTasks.map((t: any, i: number) => `${i + 1}. "${t.title}" — ${t.minutes} min`).join("\n")}`;
  }

  if (metrics.avgEstimateDeviation !== null && metrics.avgEstimateDeviation !== undefined) {
    text += `\n\n**Estimativa vs. Tempo Real:**
- Desvio médio: ${metrics.avgEstimateDeviation} minutos (positivo = demorou mais que o estimado)`;
    if (metrics.topDeviations?.length > 0) {
      text += `\n- Maiores desvios:\n${metrics.topDeviations.map((d: any, i: number) => `  ${i + 1}. "${d.title}" — estimado: ${d.estimated}min, real: ${d.actual}min (desvio: ${d.deviation > 0 ? '+' : ''}${d.deviation}min)`).join("\n")}`;
    }
  }

  if (metrics.avgDifficulty) {
    text += `\n\n**Avaliação de Dificuldade (1-5):**
- Média de dificuldade: ${metrics.avgDifficulty}/5
- Distribuição: ${metrics.difficultyDistribution?.map((d: any) => `${d.rating}★=${d.count}`).join(", ")}`;
    if (metrics.hardestTasks?.length > 0) {
      text += `\n- Tarefas mais difíceis:\n${metrics.hardestTasks.map((t: any, i: number) => `  ${i + 1}. "${t.title}" — dificuldade ${t.difficulty}/5`).join("\n")}`;
    }
  }

  return text;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { metrics, previousMetrics, filters } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const analysisType: AnalysisType = filters.analysisType || "productivity";
    const hasComparison = !!previousMetrics;

    const systemPrompt = buildSystemPrompt(analysisType, hasComparison);

    const periodLabel = filters.periodLabel || "Período não especificado";
    const sectorLabel = filters.sectorName || "Todos os setores";
    const employeeLabel = filters.employeeName || "Todos os funcionários";

    let userPrompt = `Analise os seguintes dados de performance:

**Filtros aplicados:**
- Período: ${periodLabel}
- Setor: ${sectorLabel}
- Funcionário: ${employeeLabel}
- Tipo de análise: ${analysisTypeLabels[analysisType]}

${buildMetricsText(metrics, "Métricas do período atual")}`;

    if (hasComparison) {
      userPrompt += `\n\n---\n\n${buildMetricsText(previousMetrics, "Métricas do período anterior (para comparação)")}`;
    }

    userPrompt += `\n\nGere uma análise completa e detalhada com base nesses dados.`;

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
