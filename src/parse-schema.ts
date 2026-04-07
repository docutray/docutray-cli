import {existsSync, readFileSync} from 'node:fs'

export function parseSchema(input: string): Record<string, unknown> {
  // Try as file path first
  if (existsSync(input)) {
    const content = readFileSync(input, 'utf8')
    try {
      const parsed = JSON.parse(content)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('JSON schema must be an object')
      }

      return parsed as Record<string, unknown>
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in schema file "${input}": ${error.message}`)
      }

      throw error
    }
  }

  // Try as inline JSON
  try {
    const parsed = JSON.parse(input)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('JSON schema must be an object')
    }

    return parsed as Record<string, unknown>
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid schema: not a valid file path or JSON string`)
    }

    throw error
  }
}
