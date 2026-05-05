import {existsSync, statSync} from 'node:fs'

/**
 * Format DocuTray API keys are expected to follow.
 *
 * Real keys are emitted by the dashboard as `dt` followed by a long URL-safe
 * base64 payload (currently 64 chars after the prefix, total length 66). The
 * pattern is intentionally permissive on length (≥20 chars after `dt`) so
 * minor changes in the dashboard's key generator don't reject legitimate keys.
 *
 * Tight enough to reject the v0.2.1 garbage cases (`"2"`, empty string,
 * arbitrary text without the `dt` prefix) and silently-paste mistakes.
 */
export const DOCUTRAY_API_KEY_PATTERN = /^dt[A-Za-z0-9_-]{20,}$/

export function validateApiKey(value: string): string {
  const trimmed = (value ?? '').trim()
  if (!DOCUTRAY_API_KEY_PATTERN.test(trimmed)) {
    const preview = trimmed.length > 0 ? trimmed.slice(0, 12) : '(empty)'
    throw new Error(
      `Invalid API key format. Expected a DocuTray API key starting with "dt" (got: ${preview}…)`,
    )
  }

  return trimmed
}

export function parseJsonFlag(value: string, flagName: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value)

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error(`${flagName} must be a JSON object`)
    }

    return parsed as Record<string, unknown>
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${flagName}: ${value}`)
    }

    throw error
  }
}

export function validateUrl(value: string, flagName: string): string {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error(`${flagName} must use http or https protocol`)
    }

    return value
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
