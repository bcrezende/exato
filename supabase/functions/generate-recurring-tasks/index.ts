import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Date helpers ──
// Dates in the DB are stored as "fake UTC" — the UTC components represent
// local time. So getUTCHours() on a stored date gives the user's local hour.

function isWeekend(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

function isHoliday(d: Date, holidays: { holiday_date: string; is_recurring: boolean }[]): boolean {
  const month = d.getUTCMonth() + 1;
  const dayOfMonth = d.getUTCDate();
  const year = d.getUTCFullYear();
  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayOfMonth).padStart(2, "0")}`;

  for (const h of holidays) {
    if (h.is_recurring) {
      const parts = h.holiday_date.split("-");
      if (parts.length === 3 && parseInt(parts[1]) === month && parseInt(parts[2]) === dayOfMonth) return true;
    } else {
      if (h.holiday_date === dateStr) return true;
    }
  }
  return false;
}

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
    const day = adjusted.getUTCDay();
    if (skipWeekends && isWeekend(adjusted)) {
      adjusted.setUTCDate(adjusted.getUTCDate() + 1);
      safety++;
      continue;
    }
    if (weekdays && weekdays.length > 0 && !weekdays.includes(day)) {
      adjusted.setUTCDate(adjusted.getUTCDate() + 1);
      safety++;
      continue;
    }
    if (skipHolidays && isHoliday(adjusted, holidays)) {
      adjusted.setUTCDate(adjusted.getUTCDate() + 1);
      safety++;
      continue;
    }
    break;
  }
  return adjusted;
}

/** Build a fake-UTC ISO string from components */
function fakeUtcISO(year: number, month: number, day: number, hour: number, min: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00+00:00`;
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
    // Compare against current local time in fake-UTC format
    const nowFakeUtc = fakeUtcISO(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
    // But edge function runs in UTC, and we need to check per-company timezone...
    // Actually, since dates are stored as fake UTC representing local time,
    // we need the company timezone to know what "now" is in local time.
    // For the overdue check, we'll fetch tasks per company.

    let overdueCount = 0;
    if (!singleParentId) {
      // Get all companies with their timezones
      const { data: companies } = await supabase.from("companies").select("id, timezone");
      
      for (const company of (companies || [])) {
        const tz = company.timezone || "America/Sao_Paulo";
        // Get current local time in the company's timezone
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit", second: "2-digit",
          hour12: false,
        });
        const parts = formatter.formatToParts(now);
        const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || "0");
        const localNowISO = fakeUtcISO(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));

        const { data: overdueTasks } = await supabase
          .from("tasks")
          .select("id")
          .eq("company_id", company.id)
          .lt("due_date", localNowISO)
          .in("status", ["pending"]);

        if (overdueTasks && overdueTasks.length > 0) {
          const overdueIds = overdueTasks.map((t: { id: string }) => t.id);
          const { error: updateError } = await supabase
            .from("tasks")
            .update({ status: "overdue" })
            .in("id", overdueIds);

          if (!updateError) {
            overdueCount += overdueIds.length;
            console.log(`Marked ${overdueIds.length} tasks as overdue for company ${company.id}`);
          }
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

    // Fetch recurrence definitions
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

    // Fetch holidays
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

    // Fetch company timezones for "now" comparison
    const { data: companiesData } = await supabase
      .from("companies")
      .select("id, timezone")
      .in("id", companyIds);

    const tzMap = new Map<string, string>();
    if (companiesData) {
      for (const c of companiesData) {
        tzMap.set(c.id, c.timezone || "America/Sao_Paulo");
      }
    }

    let createdCount = 0;

    for (const parent of parentTasks) {
      const defKey = `${parent.company_id}:${parent.recurrence_type}`;
      const def = defsMap.get(defKey);
      const holidays = holidaysMap.get(parent.company_id) || [];
      const tz = tzMap.get(parent.company_id) || "America/Sao_Paulo";

      // Get "now" in company local time for comparison
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false,
      });
      const parts = formatter.formatToParts(now);
      const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || "0");
      const nowLocalFakeUtc = new Date(Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")));

      // For weekday-based recurrences
      if (def && def.weekdays && def.weekdays.length > 0 && def.interval_unit === "week") {
        // Since dates are fake UTC, we work directly with UTC methods
        const parentStart = parent.start_date ? new Date(parent.start_date) : nowLocalFakeUtc;
        const parentEnd = parent.due_date ? new Date(parent.due_date) : null;
        const durationMs = parentEnd && parent.start_date
          ? parentEnd.getTime() - new Date(parent.start_date).getTime()
          : 3600000;

        const startHour = parentStart.getUTCHours();
        const startMin = parentStart.getUTCMinutes();

        // Get start of current week (Sunday) in fake UTC
        const weekStart = new Date(Date.UTC(
          nowLocalFakeUtc.getUTCFullYear(), nowLocalFakeUtc.getUTCMonth(), nowLocalFakeUtc.getUTCDate()
        ));
        weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());

        for (const wd of def.weekdays) {
          const candidate = new Date(weekStart);
          candidate.setUTCDate(candidate.getUTCDate() + wd);
          candidate.setUTCHours(startHour, startMin, 0, 0);

          // Skip past
          if (candidate < nowLocalFakeUtc) continue;
          // Skip holidays
          if (def.skip_holidays && isHoliday(candidate, holidays)) continue;

          // Check existing
          const dayStart = fakeUtcISO(candidate.getUTCFullYear(), candidate.getUTCMonth(), candidate.getUTCDate(), 0, 0);
          const dayEnd = fakeUtcISO(candidate.getUTCFullYear(), candidate.getUTCMonth(), candidate.getUTCDate(), 23, 59);

          const { data: existing } = await supabase
            .from("tasks")
            .select("id")
            .eq("recurrence_parent_id", parent.id)
            .gte("start_date", dayStart)
            .lte("start_date", dayEnd)
            .limit(1);

          if (existing && existing.length > 0) continue;

          const candidateISO = candidate.toISOString();
          const endISO = new Date(candidate.getTime() + durationMs).toISOString();

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
            start_date: candidateISO,
            due_date: endISO,
          });

          if (insertError) {
            if (insertError.code === "23505") {
              console.log(`Skipped duplicate weekday instance for parent ${parent.id}`);
            } else {
              console.error(`Error creating weekday instance:`, insertError);
            }
          } else {
            createdCount++;
            console.log(`Created weekday instance for parent ${parent.id}: day=${wd}`);
          }
        }
        continue;
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

      const refStart = reference.start_date ? new Date(reference.start_date) : nowLocalFakeUtc;
      const refEnd = reference.due_date ? new Date(reference.due_date) : null;
      const durationMs = refEnd && reference.start_date
        ? refEnd.getTime() - new Date(reference.start_date).getTime()
        : 3600000;

      const hour = refStart.getUTCHours();
      const min = refStart.getUTCMinutes();

      // Calculate next start using UTC methods (since fake UTC = local)
      let newStart = new Date(refStart);

      if (def && def.interval_value > 0) {
        switch (def.interval_unit) {
          case "day":
            newStart.setUTCDate(newStart.getUTCDate() + def.interval_value);
            break;
          case "week":
            newStart.setUTCDate(newStart.getUTCDate() + (def.interval_value * 7));
            break;
          case "month":
            newStart.setUTCMonth(newStart.getUTCMonth() + def.interval_value);
            break;
          case "year":
            newStart.setUTCFullYear(newStart.getUTCFullYear() + def.interval_value);
            break;
          default:
            continue;
        }
      } else {
        switch (parent.recurrence_type) {
          case "daily": newStart.setUTCDate(newStart.getUTCDate() + 1); break;
          case "weekly": newStart.setUTCDate(newStart.getUTCDate() + 7); break;
          case "monthly": newStart.setUTCMonth(newStart.getUTCMonth() + 1); break;
          case "yearly": newStart.setUTCFullYear(newStart.getUTCFullYear() + 1); break;
          default: continue;
        }
      }

      // Preserve original hour/minute
      newStart.setUTCHours(hour, min, 0, 0);

      // Adjust for weekdays/weekends/holidays
      const skipWeekends = def?.skip_weekends || false;
      const skipHolidays = def?.skip_holidays || false;
      const weekdays = def?.weekdays || null;

      newStart = adjustToValidDay(newStart, weekdays, skipWeekends, skipHolidays, holidays);
      newStart.setUTCHours(hour, min, 0, 0);

      // Check if instance already exists
      const dayStartISO = fakeUtcISO(newStart.getUTCFullYear(), newStart.getUTCMonth(), newStart.getUTCDate(), 0, 0);
      const dayEndISO = fakeUtcISO(newStart.getUTCFullYear(), newStart.getUTCMonth(), newStart.getUTCDate(), 23, 59);

      const { data: existing } = await supabase
        .from("tasks")
        .select("id")
        .eq("recurrence_parent_id", parent.id)
        .gte("start_date", dayStartISO)
        .lte("start_date", dayEndISO)
        .limit(1);

      if (existing && existing.length > 0) continue;

      const newEnd = new Date(newStart.getTime() + durationMs);

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
        console.log(`Created instance for parent ${parent.id}: ${parent.title} — ${newStart.toISOString()}`);
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
