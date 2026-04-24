import type { Request, Response } from 'express'
import type { DoistCardRequest, DoistCardResponse } from '@doist/ui-extensions-core'
import { DoistCard, TextBlock, SubmitAction } from '@doist/ui-extensions-core'
import { startTimer, getCurrentTimer, stopTimer, findOrCreateProject } from '../services/toggl'
import { getTaskProjectName } from '../services/todoist'

export async function startHandler(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as DoistCardRequest
    const { actionType, actionId, params } = body.action
    const data = params as { contentPlain?: string; content?: string } | undefined
    const taskContent = data?.contentPlain ?? data?.content ?? 'Task'

    if (actionType === 'initial') {
      const card = new DoistCard()
      const text = new TextBlock(taskContent)
      text.wrap = true
      card.addItem(text)
      const action = new SubmitAction()
      action.id = 'start-timer'
      action.title = '▶ Start timer'
      action.style = 'positive'
      action.data = { sourceId: (data as { sourceId?: string } | undefined)?.sourceId }
      card.addAction(action)
      const response: DoistCardResponse = { card }
      res.json(response)
      return
    }

    if (actionType === 'submit' && actionId === 'start-timer') {
      const sourceId = body.action.data?.['sourceId'] as string | undefined
      const appToken = req.headers['x-todoist-apptoken'] as string | undefined
      console.log(`[process] start-timer submit: sourceId=${sourceId ?? 'none'} appToken=${appToken ? 'present' : 'missing'}`)
      let projectId: number | undefined
      if (sourceId && appToken) {
        const projectName = await getTaskProjectName(sourceId, appToken)
        console.log(`[process] resolved projectName=${projectName ?? 'null'}`)
        if (projectName) projectId = await findOrCreateProject(projectName)
      } else {
        console.log('[process] skipping project lookup: sourceId or appToken missing')
      }
      await startTimer(taskContent, projectId)
      const response: DoistCardResponse = {
        bridges: [
          { bridgeActionType: 'display.notification', notification: { type: 'success', text: 'Timer started' } },
          { bridgeActionType: 'finished' },
        ],
      }
      res.json(response)
      return
    }

    res.status(400).end()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const response: DoistCardResponse = {
      bridges: [{ bridgeActionType: 'display.notification', notification: { type: 'error', text: `Toggl error: ${message}` } }],
    }
    res.json(response)
  }
}

export async function stopHandler(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as DoistCardRequest
    const { actionType, actionId } = body.action

    if (actionType === 'initial') {
      const running = await getCurrentTimer()
      const card = new DoistCard()
      if (running) {
        const text = new TextBlock(running.description || 'Running timer')
        text.wrap = true
        card.addItem(text)
        const action = new SubmitAction()
        action.id = 'stop-timer'
        action.title = '■ Stop timer'
        action.style = 'destructive'
        card.addAction(action)
      } else {
        card.addItem(new TextBlock('No timer is currently running.'))
      }
      const response: DoistCardResponse = { card }
      res.json(response)
      return
    }

    if (actionType === 'submit' && actionId === 'stop-timer') {
      await stopTimer()
      const response: DoistCardResponse = {
        bridges: [
          { bridgeActionType: 'display.notification', notification: { type: 'success', text: 'Timer stopped' } },
          { bridgeActionType: 'finished' },
        ],
      }
      res.json(response)
      return
    }

    res.status(400).end()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const response: DoistCardResponse = {
      bridges: [{ bridgeActionType: 'display.notification', notification: { type: 'error', text: `Toggl error: ${message}` } }],
    }
    res.json(response)
  }
}
