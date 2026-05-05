import {describe, expect, it, vi} from 'vitest'

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  statSync: vi.fn(),
}))

import {existsSync, statSync} from 'node:fs'
import {parseJsonFlag, validateApiKey, validateSource, validateUrl} from '../src/validators.js'

const mockExistsSync = vi.mocked(existsSync)
const mockStatSync = vi.mocked(statSync)

describe('parseJsonFlag', () => {
  it('parses valid JSON', () => {
    expect(parseJsonFlag('{"key":"value"}', '--metadata')).toEqual({key: 'value'})
  })

  it('rejects JSON arrays', () => {
    expect(() => parseJsonFlag('[1,2,3]', '--metadata')).toThrow('--metadata must be a JSON object')
  })

  it('rejects JSON primitives', () => {
    expect(() => parseJsonFlag('"hello"', '--metadata')).toThrow('--metadata must be a JSON object')
    expect(() => parseJsonFlag('42', '--metadata')).toThrow('--metadata must be a JSON object')
    expect(() => parseJsonFlag('null', '--metadata')).toThrow('--metadata must be a JSON object')
  })

  it('throws on invalid JSON with flag name and value', () => {
    expect(() => parseJsonFlag('{"bad', '--metadata')).toThrow('Invalid JSON in --metadata: {"bad')
  })

  it('throws on non-JSON string', () => {
    expect(() => parseJsonFlag('not-json', '--metadata')).toThrow('Invalid JSON in --metadata: not-json')
  })
})

describe('validateUrl', () => {
  it('accepts valid https URL', () => {
    expect(validateUrl('https://example.com/hook', '--webhook-url')).toBe('https://example.com/hook')
  })

  it('accepts valid http URL', () => {
    expect(validateUrl('http://localhost:3000/hook', '--webhook-url')).toBe('http://localhost:3000/hook')
  })

  it('returns original URL without normalization', () => {
    expect(validateUrl('https://example.com', '--webhook-url')).toBe('https://example.com')
  })

  it('throws on invalid URL', () => {
    expect(() => validateUrl('not-a-url', '--webhook-url')).toThrow('Invalid URL in --webhook-url: not-a-url')
  })

  it('throws on non-http protocol', () => {
    expect(() => validateUrl('ftp://example.com/file', '--webhook-url')).toThrow('--webhook-url must use http or https protocol')
  })
})

describe('validateSource', () => {
  it('skips validation for http URLs', () => {
    const result = validateSource('http://example.com/doc.pdf')
    expect(result).toEqual({isUrl: true})
    expect(mockExistsSync).not.toHaveBeenCalled()
  })

  it('skips validation for https URLs', () => {
    const result = validateSource('https://example.com/doc.pdf')
    expect(result).toEqual({isUrl: true})
    expect(mockExistsSync).not.toHaveBeenCalled()
  })

  it('accepts existing file', () => {
    mockExistsSync.mockReturnValue(true)
    mockStatSync.mockReturnValue({isDirectory: () => false} as any)
    const result = validateSource('invoice.pdf')
    expect(result).toEqual({isUrl: false})
  })

  it('throws on nonexistent file', () => {
    mockExistsSync.mockReturnValue(false)
    expect(() => validateSource('nonexistent.pdf')).toThrow('File not found: nonexistent.pdf')
  })

  it('throws on directory', () => {
    mockExistsSync.mockReturnValue(true)
    mockStatSync.mockReturnValue({isDirectory: () => true} as any)
    expect(() => validateSource('./some-directory')).toThrow('Expected a file, got a directory: ./some-directory')
  })
})

describe('validateApiKey', () => {
  it('accepts a real-format key (dt + 64 base64url chars)', () => {
    // Same shape the dashboard emits: `dt` + 64 URL-safe base64 chars.
    const key = 'dtUXtMlrFQTPaBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789AbCdEfGhIjKlMnOpQrSt'
    expect(validateApiKey(key)).toBe(key)
  })

  it('accepts a legacy dt_live_… style key', () => {
    const key = 'dt_live_abcDEF0123456789abc'
    expect(validateApiKey(key)).toBe(key)
  })

  it('accepts a legacy dt_test_… style key', () => {
    const key = 'dt_test_xyz0123456789abcdef_-'
    expect(validateApiKey(key)).toBe(key)
  })

  it('accepts URL-safe base64 characters', () => {
    const key = 'dtaA0_-aA0_-aA0_-aA0_-aA0_-'
    expect(validateApiKey(key)).toBe(key)
  })

  it('trims surrounding whitespace before validating', () => {
    const key = 'dt_live_abcDEF0123456789abc'
    expect(validateApiKey(`  ${key}  `)).toBe(key)
    expect(validateApiKey(`\n${key}\n`)).toBe(key)
  })

  it('rejects empty string', () => {
    expect(() => validateApiKey('')).toThrow(/^Invalid API key format/)
  })

  it('rejects whitespace-only string', () => {
    expect(() => validateApiKey('   ')).toThrow(/^Invalid API key format/)
  })

  it('rejects garbage like "2"', () => {
    expect(() => validateApiKey('2')).toThrow(/^Invalid API key format/)
  })

  it('rejects wrong prefix', () => {
    expect(() => validateApiKey('sk_live_abcDEF0123456789abc')).toThrow(/^Invalid API key format/)
  })

  it('rejects "dt" alone (too short)', () => {
    expect(() => validateApiKey('dt')).toThrow(/^Invalid API key format/)
  })

  it('rejects keys shorter than 22 chars total', () => {
    expect(() => validateApiKey('dtshort1')).toThrow(/^Invalid API key format/)
    expect(() => validateApiKey('dt_live_short')).toThrow(/^Invalid API key format/)
  })

  it('rejects non-base64url characters', () => {
    expect(() => validateApiKey('dt!!!@@@###$$$%%%^^^&&&***')).toThrow(/^Invalid API key format/)
  })

  it('error message includes a preview of the offending input', () => {
    expect(() => validateApiKey('garbage-input-12345')).toThrow(/got: garbage-inpu…/)
  })

  it('error message handles empty input gracefully', () => {
    expect(() => validateApiKey('')).toThrow(/got: \(empty\)…/)
  })
})
