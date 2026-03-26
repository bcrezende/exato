/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as taskReminder5min } from './task-reminder-5min.tsx'
import { template as taskLateStart } from './task-late-start.tsx'
import { template as taskOverdue } from './task-overdue.tsx'
import { template as taskInProgressOverdue } from './task-in-progress-overdue.tsx'
import { template as taskPreviousDayUnstarted } from './task-previous-day-unstarted.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'task-reminder-5min': taskReminder5min,
  'task-late-start': taskLateStart,
  'task-overdue': taskOverdue,
  'task-in-progress-overdue': taskInProgressOverdue,
  'task-previous-day-unstarted': taskPreviousDayUnstarted,
}
