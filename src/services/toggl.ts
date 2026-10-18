import { logger } from '../utils/logger'

// Toggl 2.0 (focus.toggl.com) API, scoped to one organisation and workspace.
const API_BASE = 'https://focus.toggl.com/api'

export interface TogglTimeEntry {
  id: number
  description?: string
  task_id?: number | null
  project_id?: number
  start?: string
}

interface TogglTask {
  id: number
  name: string
}

interface StartFromDescriptionResponse {
  time_entry: TogglTimeEntry
  task?: TogglTask
  task_created?: boolean
  project_created?: boolean
}

export interface StartTimerOptions {
  name: string
  projectName?: string | undefined
  sourceUrl?: string | undefined
}

function workspaceUrl(path: string): string {
  const organizationId = process.env['TOGGL_ORGANIZATION_ID'] ?? ''
  const workspaceId = process.env['TOGGL_WORKSPACE_ID'] ?? ''
  return `${API_BASE}/organizations/${organizationId}/workspaces/${workspaceId}/${path}`
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env['TOGGL_API_TOKEN'] ?? ''}`,
    'Content-Type': 'application/json',
  }
}

async function request<T>(label: string, method: string, path: string, body?: unknown): Promise<T | null> {
  const res = await fetch(workspaceUrl(path), {
    method,
    headers: headers(),
    ...(body !== undefined && { body: JSON.stringify(body) }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Toggl ${label} ${res.status}: ${text}`)
  }
  const text = res.status === 204 ? '' : await res.text()
  return text ? JSON.parse(text) as T : null
}

// Starts a timer linked to a Toggl task. With a source URL the task is matched
// by that URL (so each Todoist task maps to one Toggl task) and created if
// missing. The project is matched by name and created if missing.
export async function startTimer({ name, projectName, sourceUrl }: StartTimerOptions): Promise<TogglTimeEntry> {
  logger.debug(`[toggl] starting timer: "${name}" project=${projectName ?? 'none'} url=${sourceUrl ?? 'none'}`)
  const result = await request<StartFromDescriptionResponse>('start timer', 'POST', 'tracking/start-from-description', {
    type: 'activity',
    name,
    extension_source: 'todoist',
    create_task_if_not_found: true,
    ...(sourceUrl
      ? { extension_url: sourceUrl, resolution_strategy: 'uri' }
      : { resolution_strategy: 'name_project' }),
    ...(projectName && { project_name: projectName, create_project_if_not_found: true }),
  })
  if (!result?.time_entry) throw new Error('Toggl start timer returned no time entry')
  const entry = result.time_entry
  logger.debug(`[toggl] timer started id=${entry.id} task_id=${entry.task_id ?? 'none'} task_created=${result.task_created ?? false} project_created=${result.project_created ?? false}`)
  return entry
}

export async function getCurrentTimer(): Promise<TogglTimeEntry | null> {
  return request<TogglTimeEntry>('get current timer', 'GET', 'tracking/current')
}

// The name Toggl shows for an entry: its description, else its task's name.
export async function getTimerName(entry: TogglTimeEntry): Promise<string> {
  if (entry.description) return entry.description
  if (!entry.task_id) return ''
  const task = await request<TogglTask>('get task', 'GET', `tasks/${entry.task_id}`)
  return task?.name ?? ''
}

export async function stopTimer(): Promise<TogglTimeEntry> {
  const entry = await request<TogglTimeEntry>('stop timer', 'POST', 'tracking/stop', {
    end: new Date().toISOString(),
  })
  if (!entry) throw new Error('No running timer')
  return entry
}
