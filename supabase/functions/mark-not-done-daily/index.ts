import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all companies with their timezones
    const { data: companies, error: compErr } = await supabase
      .from("companies")
      .select("id, timezone");
    if (compErr) throw compErr;

    let totalMarked = 0;

    for (const company of companies || []) {
      // Calculate "today" in the company's timezone
      // Since dates are stored as "fake UTC" (local time with +00:00),
      // we need to find what "today" is in the company's timezone
      // and compare against the date portion of due_date.
      const tz = company.timezone || "America/Sao_Paulo";
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const todayStr = formatter.format(new Date()); // "2026-03-25"
      const todayStart = `${todayStr}T00:00:00+00:00`;

      // Find pending/in_progress tasks with due_date before today
      const { data: tasksToMark, error: fetchErr } = await supabase
        .from("tasks")
        .select("id, assigned_to, due_date, title")
        .eq("company_id", company.id)
        .in("status", ["pending", "in_progress"])
        .not("due_date", "is", null)
        .lt("due_date", todayStart);

      if (fetchErr) {
        console.error(`Error fetching tasks for company ${company.id}:`, fetchErr);
        continue;
      }

      if (!tasksToMark || tasksToMark.length === 0) continue;

      const taskIds = tasksToMark.map((t) => t.id);

      // Bulk update status
      const { error: updateErr } = await supabase
        .from("tasks")
        .update({ status: "not_done" })
        .in("id", taskIds);

      if (updateErr) {
        console.error(`Error updating tasks for company ${company.id}:`, updateErr);
        continue;
      }

      // Insert logs
      const logs = tasksToMark.map((task) => ({
        task_id: task.id,
        user_id: task.assigned_to,
        auto_generated: true,
        original_due_date: task.due_date,
        next_action: "Aguardando ação do usuário",
      }));

      const { error: logErr } = await supabase
        .from("task_not_done_logs")
        .insert(logs);

      if (logErr) {
        console.error(`Error inserting logs for company ${company.id}:`, logErr);
      }

      totalMarked += tasksToMark.length;
    }

    return new Response(
      JSON.stringify({ message: `${totalMarked} tarefas marcadas como não feitas` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
