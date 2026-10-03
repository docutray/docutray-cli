import {existsSync, statSync} from 'node:fs'

/**
 * Basic format check for DocuTray API keys, not server-side authentication.
 *
 * OAuth adds a `dt` prefix; dashboard keys can be unprefixed. Both use long
 * URL-safe payloads (currently 64 chars). Keep accepting older `dt` keys with
 * at least 20 payload chars, and allow opaque keys of at least 32 chars so
 * minor generator changes don't reject legitimate keys.
 *
 * Rejects short accidental inputs and invalid characters. The API determines
 * whether a key is valid and which organization it belongs to.
 */
export const DOCUTRAY_API_KEY_PATTERN = /^(?:dt[A-Za-z0-9_-]{20,}|[A-Za-z0-9_-]{32,})$/

export function validateApiKey(value: string): string {
  const trimmed = (value ?? '').trim()
  if (!DOCUTRAY_API_KEY_PATTERN.test(trimmed)) {
    throw new Error(
      'Invalid API key format. Expected a URL-safe DocuTray API key: at least 32 characters, or "dt" followed by at least 20 characters.',
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
