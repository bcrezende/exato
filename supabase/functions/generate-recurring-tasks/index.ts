import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Timezone helpers ──

/** Get UTC offset in ms for a given IANA timezone at a specific UTC date */
function getTimezoneOffsetMs(timezone: string, utcDate: Date): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(utcDate);
    const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || "0");
    const localDate = new Date(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    // Difference between what the local clock shows and UTC
    const utcMs = Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate(),
      utcDate.getUTCHours(), utcDate.getUTCMinutes(), utcDate.getUTCSeconds());
    const localMs = localDate.getTime();
    return localMs - utcMs;
  } catch {
    // Fallback to -3h (BRT)
    return -3 * 60 * 60 * 1000;
  }
}

/** Convert a UTC Date to "local" Date object in the given timezone (shifts the instant so getHours/getDay return local values) */
function toLocalDate(utcDate: Date, timezone: string): Date {
  const offset = getTimezoneOffsetMs(timezone, utcDate);
  return new Date(utcDate.getTime() + offset);
}

/** Build a UTC Date from local year/month/day/hour/min in a timezone */
function fromLocalToUtc(localYear: number, localMonth: number, localDay: number, localHour: number, localMin: number, timezone: string): Date {
  // Create a rough UTC date, then find the offset at that point
  const rough = new Date(Date.UTC(localYear, localMonth, localDay, localHour, localMin, 0));
  const offset = getTimezoneOffsetMs(timezone, rough);
  return new Date(rough.getTime() - offset);
}

// ── Date validation helpers ──

function isWeekend(localDate: Date): boolean {
  const day = localDate.getDay();
  return day === 0 || day === 6;
}

function isHoliday(localDate: Date, holidays: { holiday_date: string; is_recurring: boolean }[]): boolean {
  const month = localDate.getMonth() + 1;
  const dayOfMonth = localDate.getDate();
  const year = localDate.getFullYear();
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

/** Advance a LOCAL date to next valid day, then return it. All day checks use getDay() which works because the Date is already shifted to local. */
function adjustToValidDay(
  localDate: Date,
  weekdays: number[] | null,
  skipWeekends: boolean,
  skipHolidays: boolean,
  holidays: { holiday_date: string; is_recurring: boolean }[]
): Date {
  let adjusted = new Date(localDate);
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

    // Fetch company timezones
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

      // For weekday-based recurrences, generate multiple instances per week
      if (def && def.weekdays && def.weekdays.length > 0 && def.interval_unit === "week") {
        const nowLocal = toLocalDate(now, tz);
        // Get start of week (Sunday) in local time
        const weekStartLocal = new Date(nowLocal);
        weekStartLocal.setDate(weekStartLocal.getDate() - weekStartLocal.getDay());
        weekStartLocal.setHours(0, 0, 0, 0);

        // Get the original local hour/minute from parent start_date
        const parentStartUtc = parent.start_date ? new Date(parent.start_date) : now;
        const parentStartLocal = toLocalDate(parentStartUtc, tz);
        const parentEndUtc = parent.due_date ? new Date(parent.due_date) : null;
        const durationMs = parentEndUtc && parent.start_date
          ? parentEndUtc.getTime() - new Date(parent.start_date).getTime()
          : 3600000;

        const startHour = parentStartLocal.getHours();
        const startMin = parentStartLocal.getMinutes();

        for (const wd of def.weekdays) {
          // Calculate candidate in local time
          const candidateLocal = new Date(weekStartLocal);
          candidateLocal.setDate(candidateLocal.getDate() + wd);
          candidateLocal.setHours(startHour, startMin, 0, 0);

          // Skip if candidate local time is in the past
          if (candidateLocal < nowLocal) continue;

          // Skip holidays if configured
          if (def.skip_holidays && isHoliday(candidateLocal, holidays)) continue;

          // Convert candidate local back to UTC for storage
          const candidateUtc = fromLocalToUtc(
            candidateLocal.getFullYear(), candidateLocal.getMonth(), candidateLocal.getDate(),
            startHour, startMin, tz
          );

          // Check if instance already exists for this day
          const startOfDayUtc = fromLocalToUtc(
            candidateLocal.getFullYear(), candidateLocal.getMonth(), candidateLocal.getDate(),
            0, 0, tz
          );
          const endOfDayUtc = fromLocalToUtc(
            candidateLocal.getFullYear(), candidateLocal.getMonth(), candidateLocal.getDate(),
            23, 59, tz
          );

          const { data: existing } = await supabase
            .from("tasks")
            .select("id")
            .eq("recurrence_parent_id", parent.id)
            .gte("start_date", startOfDayUtc.toISOString())
            .lte("start_date", endOfDayUtc.toISOString())
            .limit(1);

          if (existing && existing.length > 0) continue;

          const newEndUtc = new Date(candidateUtc.getTime() + durationMs);
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
            start_date: candidateUtc.toISOString(),
            due_date: newEndUtc.toISOString(),
          });

          if (insertError) {
            if (insertError.code === "23505") {
              console.log(`Skipped duplicate weekday instance for parent ${parent.id}`);
            } else {
              console.error(`Error creating weekday instance:`, insertError);
            }
          } else {
            createdCount++;
            console.log(`Created weekday instance for parent ${parent.id}: day=${wd} — ${candidateUtc.toISOString()} (local ${startHour}:${String(startMin).padStart(2,"0")} ${tz})`);
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

      const refStartUtc = reference.start_date ? new Date(reference.start_date) : now;
      const refEndUtc = reference.due_date ? new Date(reference.due_date) : null;
      const durationMs = refEndUtc && reference.start_date
        ? refEndUtc.getTime() - new Date(reference.start_date).getTime()
        : 3600000;

      // Convert reference start to local time to preserve hour/minute
      const refStartLocal = toLocalDate(refStartUtc, tz);
      const localHour = refStartLocal.getHours();
      const localMin = refStartLocal.getMinutes();

      // Calculate next start in LOCAL time
      let newStartLocal: Date;

      if (def && def.interval_value > 0) {
        newStartLocal = new Date(refStartLocal);
        switch (def.interval_unit) {
          case "day":
            newStartLocal.setDate(newStartLocal.getDate() + def.interval_value);
            break;
          case "week":
            newStartLocal.setDate(newStartLocal.getDate() + (def.interval_value * 7));
            break;
          case "month":
            newStartLocal.setMonth(newStartLocal.getMonth() + def.interval_value);
            break;
          case "year":
            newStartLocal.setFullYear(newStartLocal.getFullYear() + def.interval_value);
            break;
          default:
            continue;
        }
      } else {
        // Fallback legacy logic
        newStartLocal = new Date(refStartLocal);
        switch (parent.recurrence_type) {
          case "daily": newStartLocal.setDate(newStartLocal.getDate() + 1); break;
          case "weekly": newStartLocal.setDate(newStartLocal.getDate() + 7); break;
          case "monthly": newStartLocal.setMonth(newStartLocal.getMonth() + 1); break;
          case "yearly": newStartLocal.setFullYear(newStartLocal.getFullYear() + 1); break;
          default: continue;
        }
      }

      // Preserve original local hour/minute after month/year shifts
      newStartLocal.setHours(localHour, localMin, 0, 0);

      // Apply weekday/weekend/holiday adjustments (all in local time)
      const skipWeekends = def?.skip_weekends || false;
      const skipHolidays = def?.skip_holidays || false;
      const weekdays = def?.weekdays || null;

      newStartLocal = adjustToValidDay(newStartLocal, weekdays, skipWeekends, skipHolidays, holidays);
      // Preserve hour after adjustment
      newStartLocal.setHours(localHour, localMin, 0, 0);

      // Convert back to UTC for storage
      const newStartUtc = fromLocalToUtc(
        newStartLocal.getFullYear(), newStartLocal.getMonth(), newStartLocal.getDate(),
        localHour, localMin, tz
      );
      const newEndUtc = new Date(newStartUtc.getTime() + durationMs);

      // Check if instance already exists (check by local day range)
      const startOfDayUtc = fromLocalToUtc(
        newStartLocal.getFullYear(), newStartLocal.getMonth(), newStartLocal.getDate(),
        0, 0, tz
      );
      const endOfDayUtc = fromLocalToUtc(
        newStartLocal.getFullYear(), newStartLocal.getMonth(), newStartLocal.getDate(),
        23, 59, tz
      );

      const { data: existing } = await supabase
        .from("tasks")
        .select("id")
        .eq("recurrence_parent_id", parent.id)
        .gte("start_date", startOfDayUtc.toISOString())
        .lte("start_date", endOfDayUtc.toISOString())
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
        start_date: newStartUtc.toISOString(),
        due_date: newEndUtc.toISOString(),
      });

      if (insertError) {
        if (insertError.code === "23505") {
          console.log(`Skipped duplicate for parent ${parent.id}: ${parent.title}`);
        } else {
          console.error(`Error creating instance for task ${parent.id}:`, insertError);
        }
      } else {
        createdCount++;
        console.log(`Created instance for parent ${parent.id}: ${parent.title} — UTC: ${newStartUtc.toISOString()} (local ${localHour}:${String(localMin).padStart(2,"0")} ${tz})`);
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
