import {existsSync, readFileSync} from 'node:fs'

import {loadJson} from './parse-schema.js'

function readStdin(): string {
  return readFileSync(0, 'utf8')
}

// A single token with a path separator or a rules-file extension is a file
// path, not DSL: rules always have whitespace between field and operator.
function looksLikePath(input: string): boolean {
  return !/\s/.test(input) && (input.includes('/') || /\.(dsl|txt)$/i.test(input))
}

/**
 * Resolves DSL rules given as `-` (stdin), a file path, or inline text. A
 * value that looks like a path but does not exist fails instead of being sent
 * as rules.
 */
export function readRulesInput(input: string): string {
  if (input === '-') return readStdin()
  if (existsSync(input)) return readFileSync(input, 'utf8')
  if (looksLikePath(input)) throw new Error(`File not found: ${input}`)
  return input
}

/**
 * Resolves the document data to validate, given as `-` (stdin JSON), a JSON
 * file path, or an inline JSON string.
 */
export function readDataInput(input: string): unknown {
  if (input !== '-') return loadJson(input, '--data')

  try {
    return JSON.parse(readStdin())
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in --data from stdin: ${error.message}`)
    }

    throw error
  }
}
