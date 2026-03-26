import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Format a fake-UTC ISO string as HH:MM
function formatTime(isoStr: string): string {
  return isoStr.slice(11, 16)
}

// Format a fake-UTC ISO string as DD/MM/YYYY
function formatDate(isoStr: string): string {
  const [y, m, d] = isoStr.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

// Convert a real Date to fake UTC ISO for a given timezone offset in hours
function toFakeUTC(realNow: Date, offsetHours: number): string {
  const local = new Date(realNow.getTime() + offsetHours * 3600000)
  return local.toISOString().replace('Z', '+00:00')
}

// Get timezone offset in hours from IANA timezone name
function getTimezoneOffset(timezone: string): number {
  const offsets: Record<string, number> = {
    'America/Sao_Paulo': -3,
    'America/Fortaleza': -3,
    'America/Manaus': -4,
    'America/Cuiaba': -4,
    'America/Rio_Branco': -5,
    'America/Noronha': -2,
  }
  return offsets[timezone] ?? -3
}

interface TaskRow {
  id: string
  title: string
  status: string
  start_date: string | null
  due_date: string | null
  assigned_to: string | null
  company_id: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const realNow = new Date()

  // 1. Fetch all companies
  const { data: companies } = await supabase
    .from('companies')
    .select('id, timezone')

  if (!companies || companies.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let totalSent = 0

  for (const company of companies) {
    const offset = getTimezoneOffset(company.timezone || 'America/Sao_Paulo')
    const nowFake = toFakeUTC(realNow, offset)
    const nowPlus5 = toFakeUTC(new Date(realNow.getTime() + 5 * 60000), offset)

    // Local hour for "previous day unstarted" check (only 7-8am)
    const localHour = new Date(realNow.getTime() + offset * 3600000).getUTCHours()

    // Yesterday range in fake UTC
    const yesterdayLocal = new Date(realNow.getTime() + offset * 3600000)
    yesterdayLocal.setUTCDate(yesterdayLocal.getUTCDate() - 1)
    const yy = yesterdayLocal.getUTCFullYear()
    const ym = String(yesterdayLocal.getUTCMonth() + 1).padStart(2, '0')
    const yd = String(yesterdayLocal.getUTCDate()).padStart(2, '0')
    const yesterdayStart = `${yy}-${ym}-${yd}T00:00:00+00:00`
    const yesterdayEnd = `${yy}-${ym}-${yd}T23:59:59+00:00`

    // Fetch active tasks for this company (not completed, not not_done)
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, status, start_date, due_date, assigned_to, company_id')
      .eq('company_id', company.id)
      .in('status', ['pending', 'in_progress'])

    if (!tasks || tasks.length === 0) continue

    // Fetch already sent notifications for these tasks
    const taskIds = tasks.map((t: TaskRow) => t.id)
    const { data: sentNotifs } = await supabase
      .from('task_email_notifications')
      .select('task_id, notification_type')
      .in('task_id', taskIds)

    const sentSet = new Set(
      (sentNotifs || []).map((n: any) => `${n.task_id}:${n.notification_type}`)
    )

    // Collect notifications to send
    const toSend: Array<{
      task: TaskRow
      type: string
      templateName: string
      templateData: Record<string, any>
    }> = []

    for (const task of tasks as TaskRow[]) {
      if (!task.assigned_to) continue

      // 1. Reminder 5 min before start
      if (
        task.status === 'pending' &&
        task.start_date &&
        task.start_date > nowFake &&
        task.start_date <= nowPlus5 &&
        !sentSet.has(`${task.id}:reminder_5min`)
      ) {
        toSend.push({
          task,
          type: 'reminder_5min',
          templateName: 'task-reminder-5min',
          templateData: {
            taskTitle: task.title,
            startTime: formatTime(task.start_date),
          },
        })
      }

      // 2. Late start: start_date passed, still pending
      if (
        task.status === 'pending' &&
        task.start_date &&
        task.start_date < nowFake &&
        !sentSet.has(`${task.id}:late_start`)
      ) {
        toSend.push({
          task,
          type: 'late_start',
          templateName: 'task-late-start',
          templateData: {
            taskTitle: task.title,
            startTime: formatTime(task.start_date),
          },
        })
      }

      // 3. Overdue: due_date passed, not completed (pending)
      if (
        task.status === 'pending' &&
        task.due_date &&
        task.due_date < nowFake &&
        !sentSet.has(`${task.id}:overdue`)
      ) {
        toSend.push({
          task,
          type: 'overdue',
          templateName: 'task-overdue',
          templateData: {
            taskTitle: task.title,
            dueTime: formatTime(task.due_date),
          },
        })
      }

      // 4. In progress + overdue
      if (
        task.status === 'in_progress' &&
        task.due_date &&
        task.due_date < nowFake &&
        !sentSet.has(`${task.id}:in_progress_overdue`)
      ) {
        toSend.push({
          task,
          type: 'in_progress_overdue',
          templateName: 'task-in-progress-overdue',
          templateData: {
            taskTitle: task.title,
            dueTime: formatTime(task.due_date),
          },
        })
      }

      // 5. Previous day unstarted (only between 7-8am local)
      if (
        localHour >= 7 &&
        localHour < 8 &&
        task.status === 'pending' &&
        task.start_date &&
        task.start_date >= yesterdayStart &&
        task.start_date <= yesterdayEnd &&
        !sentSet.has(`${task.id}:previous_day_unstarted`)
      ) {
        toSend.push({
          task,
          type: 'previous_day_unstarted',
          templateName: 'task-previous-day-unstarted',
          templateData: {
            taskTitle: task.title,
            originalDate: formatDate(task.start_date),
          },
        })
      }
    }

    if (toSend.length === 0) continue

    // Fetch profiles + emails for assigned users
    const userIds = [...new Set(toSend.map((s) => s.task.assigned_to!))]
    
    // Fetch profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)

    const profileMap = new Map(
      (profiles || []).map((p: any) => [p.id, p.full_name || ''])
    )

    // Fetch emails from auth.users via service role
    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const emailMap = new Map(
      (authData?.users || []).map((u: any) => [u.id, u.email || ''])
    )

    // Fetch notification preferences
    const { data: prefs } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .in('user_id', userIds)

    const prefsMap = new Map(
      (prefs || []).map((p: any) => [p.user_id, p])
    )

    const prefKeyMap: Record<string, string> = {
      'reminder_5min': 'reminder_5min',
      'late_start': 'late_start',
      'overdue': 'overdue',
      'in_progress_overdue': 'in_progress_overdue',
      'previous_day_unstarted': 'previous_day_unstarted',
    }

    for (const item of toSend) {
      const userId = item.task.assigned_to!
      const email = emailMap.get(userId)
      if (!email) continue

      // Check user preference (default is true if no record)
      const userPref = prefsMap.get(userId)
      const prefKey = prefKeyMap[item.type]
      if (userPref && prefKey && userPref[prefKey] === false) continue

      const assigneeName = profileMap.get(userId) || ''
      const data = { ...item.templateData, assigneeName }

      try {
        const { data: invokeData, error: invokeError } = await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: item.templateName,
            recipientEmail: email,
            idempotencyKey: `task-notif-${item.task.id}-${item.type}`,
            templateData: data,
          },
        })

        if (invokeError) {
          console.error('Failed to invoke send-transactional-email', {
            taskId: item.task.id,
            type: item.type,
            error: invokeError,
          })
          continue
        }

        // Check if the response indicates failure
        const responseBody = typeof invokeData === 'string' ? JSON.parse(invokeData) : invokeData
        if (responseBody?.error) {
          console.error('send-transactional-email returned error', {
            taskId: item.task.id,
            type: item.type,
            error: responseBody.error,
          })
          continue
        }

        // Only record as sent if invocation was successful
        await supabase
          .from('task_email_notifications')
          .upsert(
            { task_id: item.task.id, notification_type: item.type },
            { onConflict: 'task_id,notification_type' }
          )

        totalSent++
        console.log('Notification sent', { taskId: item.task.id, type: item.type, email })
      } catch (err) {
        console.error('Failed to send notification', {
          taskId: item.task.id,
          type: item.type,
          error: err,
        })
      }
    }
  }

  return new Response(JSON.stringify({ processed: totalSent }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
