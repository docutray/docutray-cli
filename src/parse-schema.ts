import type {ConversionSpec} from 'docutray'

import {existsSync, readFileSync} from 'node:fs'

/**
 * Resolves a flag value that may be either a file path or an inline JSON
 * string. `label` is woven into the error messages so the user knows which
 * flag was at fault.
 */
function loadJson(input: string, label: string): unknown {
  if (existsSync(input)) {
    const content = readFileSync(input, 'utf8')
    try {
      return JSON.parse(content)
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in ${label} file "${input}": ${error.message}`)
      }

      throw error
    }
  }

  try {
    return JSON.parse(input)
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid ${label}: not a valid file path or JSON string`)
    }

    throw error
  }
}

function asPlainObject(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

function unwrapSchema(parsed: unknown): Record<string, unknown> {
  const obj = asPlainObject(parsed)
  if (!obj) {
    throw new Error('JSON schema must be an object')
  }

  // Accept full DocumentType payloads (from `types export` / `types get`) by
  // unwrapping the inner jsonSchema. Lets users round-trip without piping jq.
  const inner = asPlainObject(obj.jsonSchema)
  return inner ?? obj
}

/**
 * Narrows a parsed value to a conversion spec. The shape check is deliberately
 * shallow — the API validates the spec and is the single source of truth, so
 * anything with top-level `columns` or `sheets` is forwarded verbatim.
 */
function asConversionSpec(value: unknown, source: string): ConversionSpec {
  const obj = asPlainObject(value)
  if (!obj || !('columns' in obj || 'sheets' in obj)) {
    throw new Error(`Invalid ${source}: expected an object with "columns" or "sheets"`)
  }

  return obj as unknown as ConversionSpec
}

/**
 * Parses a `--conversion-spec` value: an inline spec, a file holding a bare
 * spec, or a full `types export` payload whose `conversionSpec` is extracted.
 */
export function parseConversionSpec(input: string): ConversionSpec {
  const parsed = loadJson(input, 'conversion spec')
  const obj = asPlainObject(parsed)

  if (obj && 'conversionSpec' in obj) {
    return asConversionSpec(obj.conversionSpec, 'conversion spec')
  }

  return asConversionSpec(parsed, 'conversion spec')
}

export function parseSchema(input: string): Record<string, unknown> {
  return unwrapSchema(loadJson(input, 'schema'))
}

/**
 * Parses a `--schema` value, additionally surfacing the `conversionSpec`
 * carried by a full `types export` payload so `types create` can reproduce an
 * exported type in one shot.
 *
 * The embedded spec is forwarded verbatim without the shape check applied to
 * user-typed `--conversion-spec` input: it came from the API, so a shape this
 * CLI does not recognize must still round-trip instead of blocking the create.
 */
export function parseSchemaPayload(input: string): {conversionSpec?: ConversionSpec; jsonSchema: Record<string, unknown>} {
  const parsed = loadJson(input, 'schema')
  const jsonSchema = unwrapSchema(parsed)

  // Only a wrapped payload carries a spec: a bare JSON Schema never does.
  const obj = asPlainObject(parsed)
  const isWrapped = obj !== undefined && asPlainObject(obj.jsonSchema) !== undefined
  const embedded = isWrapped ? asPlainObject(obj.conversionSpec) : undefined

  return embedded ? {conversionSpec: embedded as unknown as ConversionSpec, jsonSchema} : {jsonSchema}
}
