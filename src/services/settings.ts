import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const SETTINGS_PATH = join(process.cwd(), 'data', 'settings.json')

export interface AppSettings {
  useTodoistProject: boolean
}

const DEFAULT: AppSettings = { useTodoistProject: true }

export function loadSettings(): AppSettings {
  if (!existsSync(SETTINGS_PATH)) return { ...DEFAULT }
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, 'utf8')) as AppSettings
  } catch {
    return { ...DEFAULT }
  }
}

export function saveSettings(s: AppSettings): void {
  writeFileSync(SETTINGS_PATH, JSON.stringify(s, null, 2), 'utf8')
}
