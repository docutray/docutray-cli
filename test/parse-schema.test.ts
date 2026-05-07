import {beforeEach, describe, expect, it, vi} from 'vitest'

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => ''),
}))

import {existsSync, readFileSync} from 'node:fs'

import {parseSchema} from '../src/parse-schema.js'

const mockExistsSync = vi.mocked(existsSync)
const mockReadFileSync = vi.mocked(readFileSync)

describe('parseSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExistsSync.mockReturnValue(false)
  })

  describe('inline JSON', () => {
    it('parses a raw JSON Schema', () => {
      const schema = '{"type":"object","properties":{"total":{"type":"number"}},"required":["total"]}'
      expect(parseSchema(schema)).toEqual({
        properties: {total: {type: 'number'}},
        required: ['total'],
        type: 'object',
      })
    })

    it('unwraps a full DocumentType payload by extracting jsonSchema', () => {
      const documentType = {
        codeType: 'factura',
        createdAt: '2026-01-01T00:00:00Z',
        description: 'Factura electrónica',
        id: 'dt_123',
        isDraft: false,
        isPublic: true,
        jsonSchema: {properties: {total: {type: 'number'}}, required: ['total'], type: 'object'},
        name: 'Factura',
        status: 'PUBLISHED',
        updatedAt: '2026-01-02T00:00:00Z',
      }

      expect(parseSchema(JSON.stringify(documentType))).toEqual(documentType.jsonSchema)
    })

    it('returns the object unchanged when jsonSchema key is absent', () => {
      const schema = '{"type":"object","properties":{}}'
      expect(parseSchema(schema)).toEqual({properties: {}, type: 'object'})
    })

    it('does not unwrap when jsonSchema is null', () => {
      const payload = {jsonSchema: null, properties: {}, type: 'object'}
      expect(parseSchema(JSON.stringify(payload))).toEqual(payload)
    })

    it('does not unwrap when jsonSchema is not an object', () => {
      const payload = {jsonSchema: 'not-an-object', type: 'object'}
      expect(parseSchema(JSON.stringify(payload))).toEqual(payload)
    })

    it('rejects arrays', () => {
      expect(() => parseSchema('[1,2,3]')).toThrow('JSON schema must be an object')
    })

    it('rejects invalid JSON', () => {
      expect(() => parseSchema('not-json')).toThrow('not a valid file path or JSON string')
    })
  })

  describe('file path', () => {
    it('reads and parses a raw schema file', () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue('{"type":"object","properties":{"amount":{"type":"number"}}}')

      expect(parseSchema('schema.json')).toEqual({
        properties: {amount: {type: 'number'}},
        type: 'object',
      })
    })

    it('unwraps a DocumentType payload from a file (round-trip)', () => {
      const documentType = {
        codeType: 'factura',
        id: 'dt_123',
        jsonSchema: {properties: {}, required: [], type: 'object'},
        name: 'Factura',
      }
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify(documentType))

      expect(parseSchema('factura.json')).toEqual(documentType.jsonSchema)
    })

    it('rejects invalid JSON in a file', () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue('not valid json')

      expect(() => parseSchema('bad.json')).toThrow('Invalid JSON in schema file "bad.json"')
    })
  })
})
