import {existsSync, readFileSync} from 'node:fs'

function unwrap(parsed: unknown): Record<string, unknown> {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('JSON schema must be an object')
  }

  const obj = parsed as Record<string, unknown>
  // Accept full DocumentType payloads (from `types export` / `types get`) by
  // unwrapping the inner jsonSchema. Lets users round-trip without piping jq.
  if (
    'jsonSchema' in obj &&
    typeof obj.jsonSchema === 'object' &&
    obj.jsonSchema !== null &&
    !Array.isArray(obj.jsonSchema)
  ) {
    return obj.jsonSchema as Record<string, unknown>
  }

  return obj
}

export function parseSchema(input: string): Record<string, unknown> {
  // Try as file path first
  if (existsSync(input)) {
    const content = readFileSync(input, 'utf8')
    try {
      return unwrap(JSON.parse(content))
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in schema file "${input}": ${error.message}`)
      }

      throw error
    }
  }

  // Try as inline JSON
  try {
    return unwrap(JSON.parse(input))
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid schema: not a valid file path or JSON string`)
    }

    throw error
  }
}
