import {existsSync, statSync} from 'node:fs'

export function parseJsonFlag(value: string, flagName: string): Record<string, unknown> {
  try {
    return JSON.parse(value)
  } catch {
    throw new Error(`Invalid JSON in ${flagName}: ${value}`)
  }
}

export function validateUrl(value: string, flagName: string): string {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error(`${flagName} must use http or https protocol`)
    }

    return url.toString()
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Invalid URL in ${flagName}: ${value}`)
    }

    throw error
  }
}

export function validateSource(source: string): {isUrl: boolean} {
  const isUrl = source.startsWith('http://') || source.startsWith('https://')
  if (!isUrl) {
    if (!existsSync(source)) {
      throw new Error(`File not found: ${source}`)
    }

    if (statSync(source).isDirectory()) {
      throw new Error(`Expected a file, got a directory: ${source}`)
    }
  }

  return {isUrl}
}
