import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Check if a date falls on a weekend (Sat=6, Sun=0) */
function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/** Check if a date matches any holiday */
function isHoliday(d: Date, holidays: { holiday_date: string; is_recurring: boolean }[]): boolean {
  const month = d.getMonth() + 1;
  const dayOfMonth = d.getDate();
  const year = d.getFullYear();
  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayOfMonth).padStart(2, "0")}`;

  for (const h of holidays) {
    if (h.is_recurring) {
      // Compare only month-day
      const parts = h.holiday_date.split("-");
      if (parts.length === 3 && parseInt(parts[1]) === month && parseInt(parts[2]) === dayOfMonth) return true;
    } else {
      if (h.holiday_date === dateStr) return true;
    }
  }
  return false;
}

/** Advance date to next valid day based on constraints */
function adjustToValidDay(
  d: Date,
  weekdays: number[] | null,
  skipWeekends: boolean,
  skipHolidays: boolean,
  holidays: { holiday_date: string; is_recurring: boolean }[]
): Date {
  let adjusted = new Date(d);
  let safety = 0;
  while (safety < 365) {
    const day = adjusted.getDay();
    if (skipWeekends && isWeekend(adjusted)) {
      adjusted.setDate(adjusted.getDate() + 1);
      safety++;
      continue;
    }
    if (weekdays && weekdays.length > 0 && !weekdays.includes(day)) {
      adjusted.setDate(adjusted.getDate() + 1);
      safety++;
      continue;
    }
    if (skipHolidays && isHoliday(adjusted, holidays)) {
      adjusted.setDate(adjusted.getDate() + 1);
      safety++;
      continue;
    }
    break;
  }
  return adjusted;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();

    let singleParentId: string | null = null;
    try {
      const body = await req.json();
      singleParentId = body?.parentId || null;
    } catch {
      // No body (cron job call)
    }

    // === Step 1: Mark overdue tasks ===
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

    // Fetch all recurrence definitions (with new fields)
    const { data: allDefs } = await supabase.from("recurrence_definitions").select("*");
    const defsMap = new Map<string, {
      interval_value: number;
      interval_unit: string;
      weekdays: number[] | null;
      skip_weekends: boolean;
      skip_holidays: boolean;
    }>();
    if (allDefs) {
      for (const def of allDefs) {
        defsMap.set(`${def.company_id}:${def.key}`, {
          interval_value: def.interval_value,
          interval_unit: def.interval_unit,
          weekdays: def.weekdays || null,
          skip_weekends: def.skip_weekends || false,
          skip_holidays: def.skip_holidays || false,
        });
      }
    }

    // Fetch holidays for all relevant companies
    const companyIds = [...new Set(parentTasks.map(t => t.company_id))];
    const { data: allHolidays } = await supabase
      .from("company_holidays")
      .select("company_id, holiday_date, is_recurring")
      .in("company_id", companyIds);

    const holidaysMap = new Map<string, { holiday_date: string; is_recurring: boolean }[]>();
    if (allHolidays) {
      for (const h of allHolidays) {
        const list = holidaysMap.get(h.company_id) || [];
        list.push({ holiday_date: h.holiday_date, is_recurring: h.is_recurring });
        holidaysMap.set(h.company_id, list);
      }
    }

    let createdCount = 0;

    for (const parent of parentTasks) {
      const defKey = `${parent.company_id}:${parent.recurrence_type}`;
      const def = defsMap.get(defKey);
      const holidays = holidaysMap.get(parent.company_id) || [];

      // For weekday-based recurrences, generate multiple instances per week
      if (def && def.weekdays && def.weekdays.length > 0 && def.interval_unit === "week") {
        // Generate instances for each weekday in the current week
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
        weekStart.setHours(0, 0, 0, 0);

        const parentStart = parent.start_date ? new Date(parent.start_date) : now;
        const parentEnd = parent.due_date ? new Date(parent.due_date) : null;
        const duration = parentEnd && parent.start_date
          ? parentEnd.getTime() - new Date(parent.start_date).getTime()
          : 3600000;

        // Get time from parent
        const startHour = parentStart.getHours();
        const startMin = parentStart.getMinutes();

        for (const wd of def.weekdays) {
          const candidateDate = new Date(weekStart);
          candidateDate.setDate(candidateDate.getDate() + wd);
          candidateDate.setHours(startHour, startMin, 0, 0);

          // Skip past dates
          if (candidateDate < now) continue;

          // Skip holidays if configured
          if (def.skip_holidays && isHoliday(candidateDate, holidays)) continue;

          // Check if instance already exists for this day
          const startOfDay = new Date(candidateDate);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(candidateDate);
          endOfDay.setHours(23, 59, 59, 999);

          const { data: existing } = await supabase
            .from("tasks")
            .select("id")
            .eq("recurrence_parent_id", parent.id)
            .gte("start_date", startOfDay.toISOString())
            .lte("start_date", endOfDay.toISOString())
            .limit(1);

          if (existing && existing.length > 0) continue;

          const newEnd = new Date(candidateDate.getTime() + duration);
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
            start_date: candidateDate.toISOString(),
            due_date: newEnd.toISOString(),
          });

          if (insertError) {
            if (insertError.code === "23505") {
              console.log(`Skipped duplicate weekday instance for parent ${parent.id}`);
            } else {
              console.error(`Error creating weekday instance:`, insertError);
            }
          } else {
            createdCount++;
            console.log(`Created weekday instance for parent ${parent.id}: day=${wd} — ${candidateDate.toISOString()}`);
          }
        }
        continue; // Skip normal interval logic for weekday-based
      }

      // Standard interval-based logic
      const { data: latestInstances } = await supabase
        .from("tasks")
        .select("start_date, due_date, status")
        .eq("recurrence_parent_id", parent.id)
        .order("start_date", { ascending: false })
        .limit(1);

      const latestInstance = latestInstances?.[0];
      const reference = latestInstance || parent;

      if (latestInstance && latestInstance.status !== "completed" && latestInstance.status !== "overdue") {
        continue;
      }

      const refStart = reference.start_date ? new Date(reference.start_date) : now;
      const refEnd = reference.due_date ? new Date(reference.due_date) : null;
      const duration = refEnd && reference.start_date
        ? refEnd.getTime() - new Date(reference.start_date).getTime()
        : 3600000;

      let newStart: Date;

      if (def && def.interval_value > 0) {
        newStart = new Date(refStart);
        switch (def.interval_unit) {
          case "day":
            newStart.setDate(newStart.getDate() + def.interval_value);
            break;
          case "week":
            newStart.setDate(newStart.getDate() + (def.interval_value * 7));
            break;
          case "month":
            newStart.setMonth(newStart.getMonth() + def.interval_value);
            break;
          case "year":
            newStart.setFullYear(newStart.getFullYear() + def.interval_value);
            break;
          default:
            continue;
        }
      } else {
        // Fallback legacy logic
        switch (parent.recurrence_type) {
          case "daily": newStart = new Date(refStart); newStart.setDate(newStart.getDate() + 1); break;
          case "weekly": newStart = new Date(refStart); newStart.setDate(newStart.getDate() + 7); break;
          case "monthly": newStart = new Date(refStart); newStart.setMonth(newStart.getMonth() + 1); break;
          case "yearly": newStart = new Date(refStart); newStart.setFullYear(newStart.getFullYear() + 1); break;
          default: continue;
        }
      }

      // Apply weekday/weekend/holiday adjustments
      const skipWeekends = def?.skip_weekends || false;
      const skipHolidays = def?.skip_holidays || false;
      const weekdays = def?.weekdays || null;

      newStart = adjustToValidDay(newStart, weekdays, skipWeekends, skipHolidays, holidays);

      const newEnd = new Date(newStart.getTime() + duration);

      // Check if instance already exists
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

      if (existing && existing.length > 0) continue;

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
        if (insertError.code === "23505") {
          console.log(`Skipped duplicate for parent ${parent.id}: ${parent.title}`);
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
