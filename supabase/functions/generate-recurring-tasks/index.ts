import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all recurring parent tasks (recurrence_type != 'none' and no recurrence_parent_id)
    const { data: parentTasks, error: fetchError } = await supabase
      .from("tasks")
      .select("*")
      .neq("recurrence_type", "none")
      .is("recurrence_parent_id", null);

    if (fetchError) throw fetchError;
    if (!parentTasks || parentTasks.length === 0) {
      return new Response(JSON.stringify({ message: "No recurring tasks found", created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let createdCount = 0;
    const now = new Date();

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

      // Only generate if latest instance is completed, or no instance exists
      if (latestInstance && latestInstance.status !== "completed") {
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

      // Don't generate tasks too far in the future (more than 1 period ahead)
      if (newStart > now) {
        continue;
      }

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
        console.error(`Error creating instance for task ${parent.id}:`, insertError);
      } else {
        createdCount++;
      }
    }

    return new Response(
      JSON.stringify({ message: "Recurring tasks processed", created: createdCount }),
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
