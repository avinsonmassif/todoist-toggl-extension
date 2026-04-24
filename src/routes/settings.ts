import type { Request, Response } from 'express'
import type { DoistCardRequest, DoistCardResponse } from '@doist/ui-extensions-core'
import { DoistCard, TextBlock, ToggleInput, SubmitAction } from '@doist/ui-extensions-core'
import { loadSettings, saveSettings } from '../services/settings'

export async function settingsHandler(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as DoistCardRequest
    const { actionType, actionId } = body.action

    if (actionType === 'initial') {
      const settings = loadSettings()
      const card = new DoistCard()

      card.addItem(new TextBlock('Todoist-Toggl Extension Settings'))

      const toggle = new ToggleInput()
      toggle.id = 'use-todoist-project'
      toggle.title = 'Use Todoist Project for Toggl project'
      toggle.defaultValue = settings.useTodoistProject ? 'true' : 'false'
      card.addItem(toggle)

      const save = new SubmitAction()
      save.id = 'save-settings'
      save.title = 'Save'
      save.style = 'positive'
      card.addAction(save)

      const response: DoistCardResponse = { card }
      res.json(response)
      return
    }

    if (actionType === 'submit' && actionId === 'save-settings') {
      const useTodoistProject = body.action.inputs?.['use-todoist-project'] === 'true'
      saveSettings({ useTodoistProject })

      const card = new DoistCard()
      card.addItem(new TextBlock('Todoist-Toggl Extension Settings'))

      const toggle = new ToggleInput()
      toggle.id = 'use-todoist-project'
      toggle.title = 'Use Todoist Project for Toggl project'
      toggle.defaultValue = useTodoistProject ? 'true' : 'false'
      card.addItem(toggle)

      const save = new SubmitAction()
      save.id = 'save-settings'
      save.title = 'Save'
      save.style = 'positive'
      card.addAction(save)

      const response: DoistCardResponse = {
        card,
        bridges: [
          { bridgeActionType: 'display.notification', notification: { type: 'success', text: 'Settings saved' } },
        ],
      }
      res.json(response)
      return
    }

    res.status(400).end()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const response: DoistCardResponse = {
      bridges: [{ bridgeActionType: 'display.notification', notification: { type: 'error', text: `Settings error: ${message}` } }],
    }
    res.json(response)
  }
}
