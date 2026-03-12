import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { metrics } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um analista operacional especializado em produtividade de equipes. 
Analise os indicadores de performance fornecidos e gere insights acionáveis em português brasileiro.

Regras:
- Máximo 4 parágrafos curtos e diretos
- Identifique gargalos operacionais com base nos dados
- Aponte tendências (positivas ou negativas) no volume de conclusão
- Sugira 2-3 ações concretas e práticas para melhoria
- Use linguagem profissional mas acessível
- Se a taxa de atraso for alta (>30%), destaque como ponto crítico
- Compare departamentos quando houver diferença significativa
- Não invente dados além dos fornecidos`;

    const userPrompt = `Analise os seguintes indicadores de performance da equipe:

Tempo médio de execução geral: ${metrics.avgExecution}
Taxa de atraso geral: ${metrics.delayRate}%
Tarefas concluídas nos últimos 7 dias: ${metrics.completedLast7}
Departamento com maior gargalo: ${metrics.worstDept || "Nenhum identificado"}

Tempo médio por departamento:
${JSON.stringify(metrics.timeByDept, null, 2)}

Taxa de atraso por departamento:
${JSON.stringify(metrics.delayByDept, null, 2)}

Tendência de conclusão (últimos 7 dias):
${JSON.stringify(metrics.completionTrend, null, 2)}`;

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
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar insights" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Não foi possível gerar insights.";

    return new Response(
      JSON.stringify({ insights: content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-insights error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
