import { logger } from '../utils/logger'

export async function getTaskProjectName(taskId: string, token: string): Promise<string | null> {
  logger.debug(`[todoist] fetching task ${taskId}`)
  const taskRes = await fetch(`https://api.todoist.com/api/v1/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!taskRes.ok) {
    const body = await taskRes.text()
    logger.error(`[todoist] task fetch failed ${taskRes.status}: ${body}`)
    return null
  }
  const task = await taskRes.json() as { project_id: string }
  logger.debug(`[todoist] task project_id: ${task.project_id}`)

  const projectRes = await fetch(`https://api.todoist.com/api/v1/projects/${task.project_id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!projectRes.ok) {
    const body = await projectRes.text()
    logger.error(`[todoist] project fetch failed ${projectRes.status}: ${body}`)
    return null
  }
  const project = await projectRes.json() as { name: string }
  logger.debug(`[todoist] resolved project name: "${project.name}"`)
  return project.name
}
