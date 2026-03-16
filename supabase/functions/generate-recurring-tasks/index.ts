import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();

    // Parse optional parentId from request body
    let singleParentId: string | null = null;
    try {
      const body = await req.json();
      singleParentId = body?.parentId || null;
    } catch {
      // No body (cron job call) — process all
    }

    // === Step 1: Mark overdue tasks (only on full cron runs) ===
    let overdueCount = 0;
    if (!singleParentId) {
      const { data: overdueTasks, error: overdueError } = await supabase
        .from("tasks")
        .select("id")
        .lt("due_date", now.toISOString())
        .in("status", ["pending"]);

      if (overdueError) {
        console.error("Error fetching overdue tasks:", overdueError);
      } else if (overdueTasks && overdueTasks.length > 0) {
        const overdueIds = overdueTasks.map((t: { id: string }) => t.id);
        const { error: updateError } = await supabase
          .from("tasks")
          .update({ status: "overdue" })
          .in("id", overdueIds);

        if (updateError) {
          console.error("Error marking tasks as overdue:", updateError);
        } else {
          overdueCount = overdueIds.length;
          console.log(`Marked ${overdueIds.length} tasks as overdue`);
        }
      }
    }

    // === Step 2: Generate next recurring instances ===
    let query = supabase
      .from("tasks")
      .select("*")
      .neq("recurrence_type", "none")
      .is("recurrence_parent_id", null);

    if (singleParentId) {
      query = query.eq("id", singleParentId);
    }

    const { data: parentTasks, error: fetchError } = await query;

    if (fetchError) throw fetchError;
    if (!parentTasks || parentTasks.length === 0) {
      return new Response(JSON.stringify({ message: "No recurring tasks found", created: 0, overdue: overdueCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let createdCount = 0;

    for (const parent of parentTasks) {
      // Find the latest instance of this recurring task
      const { data: latestInstances } = await supabase
        .from("tasks")
        .select("start_date, due_date, status")
        .eq("recurrence_parent_id", parent.id)
        .order("start_date", { ascending: false })
        .limit(1);

      const latestInstance = latestInstances?.[0];

      // Use the parent itself if no instances exist yet
      const reference = latestInstance || parent;

      // Only generate if latest instance is completed OR overdue (not pending/in_progress)
      if (latestInstance && latestInstance.status !== "completed" && latestInstance.status !== "overdue") {
        continue;
      }

      // Calculate new dates
      const refStart = reference.start_date ? new Date(reference.start_date) : now;
      const refEnd = reference.due_date ? new Date(reference.due_date) : null;
      const duration = refEnd && reference.start_date
        ? refEnd.getTime() - new Date(reference.start_date).getTime()
        : 3600000; // default 1 hour

      let newStart: Date;

      switch (parent.recurrence_type) {
        case "daily":
          newStart = new Date(refStart);
          newStart.setDate(newStart.getDate() + 1);
          break;
        case "weekly":
          newStart = new Date(refStart);
          newStart.setDate(newStart.getDate() + 7);
          break;
        case "monthly":
          newStart = new Date(refStart);
          newStart.setMonth(newStart.getMonth() + 1);
          break;
        case "yearly":
          newStart = new Date(refStart);
          newStart.setFullYear(newStart.getFullYear() + 1);
          break;
        default:
          continue;
      }

      // Removed the restriction `if (newStart > now) continue`
      // Now generates even for future dates (next occurrence)

      const newEnd = new Date(newStart.getTime() + duration);

      // Check if an instance already exists for this period
      const startOfDay = new Date(newStart);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(newStart);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: existing } = await supabase
        .from("tasks")
        .select("id")
        .eq("recurrence_parent_id", parent.id)
        .gte("start_date", startOfDay.toISOString())
        .lte("start_date", endOfDay.toISOString())
        .limit(1);

      if (existing && existing.length > 0) {
        continue;
      }

      // Create the new instance
      const { error: insertError } = await supabase.from("tasks").insert({
        title: parent.title,
        description: parent.description,
        priority: parent.priority,
        status: "pending",
        assigned_to: parent.assigned_to,
        department_id: parent.department_id,
        company_id: parent.company_id,
        created_by: parent.created_by,
        recurrence_type: "none",
        recurrence_parent_id: parent.id,
        start_date: newStart.toISOString(),
        due_date: newEnd.toISOString(),
      });

      if (insertError) {
        // 23505 = unique_violation — means instance already exists (race condition), safe to skip
        if (insertError.code === "23505") {
          console.log(`Skipped duplicate for parent ${parent.id}: ${parent.title} — ${newStart.toISOString()}`);
        } else {
          console.error(`Error creating instance for task ${parent.id}:`, insertError);
        }
      } else {
        createdCount++;
        console.log(`Created instance for parent ${parent.id}: ${parent.title} — start: ${newStart.toISOString()}`);
      }
    }

    return new Response(
      JSON.stringify({ message: "Recurring tasks processed", created: createdCount, overdue: overdueCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
