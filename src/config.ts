import {chmodSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync} from 'node:fs'
import {homedir} from 'node:os'
import {join} from 'node:path'

const CONFIG_DIR = join(homedir(), '.config', 'docutray')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

export interface Config {
  apiKey?: string
  baseUrl?: string
  organizationId?: string
  organizationName?: string
}

export function getConfigDir(): string {
  return CONFIG_DIR
}

export function getConfigPath(): string {
  return CONFIG_FILE
}

export function readConfig(): Config {
  if (!existsSync(CONFIG_FILE)) return {}
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8')) as Config
  } catch {
    return {}
  }
}

export function writeConfig(config: Config): void {
  mkdirSync(CONFIG_DIR, {recursive: true})
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', {mode: 0o600})
  chmodSync(CONFIG_FILE, 0o600)
}

export function deleteConfig(): void {
  if (existsSync(CONFIG_FILE)) {
    unlinkSync(CONFIG_FILE)
  }
}

export function getApiKey(): string | undefined {
  return process.env.DOCUTRAY_API_KEY || readConfig().apiKey
}

export function getBaseUrl(): string | undefined {
  return process.env.DOCUTRAY_BASE_URL || readConfig().baseUrl
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return '****'
  return key.slice(0, 4) + '****' + key.slice(-4)
}
