import type { Request, Response } from 'express'
import type { DoistCardRequest, DoistCardResponse } from '@doist/ui-extensions-core'
import { DoistCard, TextBlock, TextInput, SubmitAction } from '@doist/ui-extensions-core'
import { startTimer, getCurrentTimer, getTimerName, stopTimer } from '../services/toggl'
import { getTaskProjectName } from '../services/todoist'
import { loadSettings } from '../services/settings'
import { logger } from '../utils/logger'

export async function startHandler(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as DoistCardRequest
    const { actionType, actionId, params } = body.action
    const data = params as { contentPlain?: string; content?: string; sourceId?: string; url?: string } | undefined
    const taskContent = data?.contentPlain ?? data?.content ?? 'Task'

    if (actionType === 'initial') {
      const sourceId = data?.sourceId
      const sourceUrl = data?.url
      const appToken = req.headers['x-todoist-apptoken'] as string | undefined
      const settings = loadSettings()

      const running = await getCurrentTimer()
      const runningName = running ? await getTimerName(running) : ''
      if (running && runningName.trim().toLowerCase() === taskContent.trim().toLowerCase()) {
        const card = new DoistCard()
        const text = new TextBlock(`"${taskContent}" is already running in Toggl.`)
        text.wrap = true
        card.addItem(text)
        const dismiss = new SubmitAction()
        dismiss.id = 'dismiss'
        dismiss.title = 'Ok'
        dismiss.style = 'positive'
        card.addAction(dismiss)
        res.json({ card } as DoistCardResponse)
        return
      }

      let prefillProject = ''
      if (settings.useTodoistProject && sourceId && appToken) {
        const projectName = await getTaskProjectName(sourceId, appToken)
        prefillProject = projectName ?? ''
      }

      const card = new DoistCard()

      const descriptionInput = new TextInput()
      descriptionInput.id = 'description'
      descriptionInput.label = 'Description'
      descriptionInput.defaultValue = taskContent
      descriptionInput.placeholder = 'Enter description'
      card.addItem(descriptionInput)

      const projectInput = new TextInput()
      projectInput.id = 'project-name'
      projectInput.label = 'Project'
      projectInput.defaultValue = prefillProject
      projectInput.placeholder = 'Enter project name'
      card.addItem(projectInput)

      const action = new SubmitAction()
      action.id = 'start-timer'
      action.title = 'Start Timer'
      action.style = 'positive'
      action.data = { sourceId, sourceUrl }
      card.addAction(action)
      const response: DoistCardResponse = { card }
      res.json(response)
      return
    }

    if (actionType === 'submit' && actionId === 'dismiss') {
      res.json({ bridges: [{ bridgeActionType: 'finished' }] } as DoistCardResponse)
      return
    }

    if (actionType === 'submit' && actionId === 'start-timer') {
      const description = body.action.inputs?.['description']?.trim() || taskContent
      const projectName = body.action.inputs?.['project-name']?.trim()
      const actionData = body.action.data as { sourceId?: string; sourceUrl?: string } | undefined
      const sourceUrl = actionData?.sourceUrl
        || (actionData?.sourceId ? `https://app.todoist.com/app/task/${actionData.sourceId}` : undefined)
      logger.debug(`[process] start-timer submit: description=${description}, projectName=${projectName ?? 'none'}, sourceUrl=${sourceUrl ?? 'none'}`)
      await startTimer({ name: description, projectName: projectName || undefined, sourceUrl })
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
        const text = new TextBlock((await getTimerName(running)) || 'Running timer')
        text.wrap = true
        card.addItem(text)
        const action = new SubmitAction()
        action.id = 'stop-timer'
        action.title = 'Stop Timer'
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
