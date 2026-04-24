interface TogglTimeEntry {
  id: number
  description: string
  duration: number
  workspace_id: number
}

interface TogglProject {
  id: number
  name: string
  workspace_id: number
}

function authHeader(): string {
  const token = process.env['TOGGL_API_TOKEN'] ?? ''
  return 'Basic ' + Buffer.from(`${token}:api_token`).toString('base64')
}

export async function findOrCreateProject(name: string): Promise<number> {
  const workspaceId = process.env['TOGGL_WORKSPACE_ID'] ?? ''
  console.log(`[toggl] listing projects in workspace ${workspaceId}`)
  const listRes = await fetch(
    `https://api.track.toggl.com/api/v9/workspaces/${workspaceId}/projects`,
    { headers: { Authorization: authHeader() } },
  )
  if (!listRes.ok) {
    const body = await listRes.text()
    throw new Error(`Toggl list projects ${listRes.status}: ${body}`)
  }
  const projects = await listRes.json() as TogglProject[]
  console.log(`[toggl] found ${projects.length} projects, looking for "${name}"`)
  const existing = projects.find((p) => p.name === name)
  if (existing) {
    console.log(`[toggl] matched existing project id=${existing.id}`)
    return existing.id
  }

  console.log(`[toggl] creating project "${name}"`)
  const createRes = await fetch(
    `https://api.track.toggl.com/api/v9/workspaces/${workspaceId}/projects`,
    {
      method: 'POST',
      headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, workspace_id: Number(workspaceId), active: true }),
    },
  )
  if (!createRes.ok) {
    const body = await createRes.text()
    throw new Error(`Toggl create project ${createRes.status}: ${body}`)
  }
  const created = await createRes.json() as TogglProject
  console.log(`[toggl] created project id=${created.id}`)
  return created.id
}

export async function startTimer(description: string, projectId?: number): Promise<TogglTimeEntry> {
  const workspaceId = process.env['TOGGL_WORKSPACE_ID'] ?? ''
  console.log(`[toggl] starting timer: "${description}" project_id=${projectId ?? 'none'}`)
  const res = await fetch(
    `https://api.track.toggl.com/api/v9/workspaces/${workspaceId}/time_entries`,
    {
      method: 'POST',
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        duration: -1,
        start: new Date().toISOString(),
        description,
        workspace_id: Number(workspaceId),
        created_with: 'todoist-toggl-extension',
        tags: [],
        billable: false,
        ...(projectId !== undefined && { project_id: projectId }),
      }),
    },
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Toggl start timer ${res.status}: ${body}`)
  }
  const entry = await res.json() as TogglTimeEntry
  console.log(`[toggl] timer started id=${entry.id}`)
  return entry
}

export async function getCurrentTimer(): Promise<TogglTimeEntry | null> {
  const res = await fetch('https://api.track.toggl.com/api/v9/me/time_entries/current', {
    headers: { Authorization: authHeader() },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Toggl get current timer ${res.status}: ${body}`)
  }
  const data: unknown = await res.json()
  if (data === null || data === undefined) return null
  return data as TogglTimeEntry
}

export async function stopTimer(): Promise<TogglTimeEntry> {
  const entry = await getCurrentTimer()
  if (!entry) throw new Error('No running timer')
  const workspaceId = process.env['TOGGL_WORKSPACE_ID'] ?? ''
  const res = await fetch(
    `https://api.track.toggl.com/api/v9/workspaces/${workspaceId}/time_entries/${entry.id}/stop`,
    {
      method: 'PATCH',
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json',
      },
    },
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Toggl stop timer ${res.status}: ${body}`)
  }
  return res.json() as Promise<TogglTimeEntry>
}
