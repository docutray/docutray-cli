import {describe, expect, it, vi} from 'vitest'

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  statSync: vi.fn(),
}))

import {existsSync, statSync} from 'node:fs'
import {parseJsonFlag, validateSource, validateUrl} from '../src/validators.js'

const mockExistsSync = vi.mocked(existsSync)
const mockStatSync = vi.mocked(statSync)

describe('parseJsonFlag', () => {
  it('parses valid JSON', () => {
    expect(parseJsonFlag('{"key":"value"}', '--metadata')).toEqual({key: 'value'})
  })

  it('parses JSON arrays', () => {
    expect(parseJsonFlag('[1,2,3]', '--metadata')).toEqual([1, 2, 3])
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
