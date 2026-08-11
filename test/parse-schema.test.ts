import {beforeEach, describe, expect, it, vi} from 'vitest'

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => ''),
}))

import {existsSync, readFileSync} from 'node:fs'

import {parseConversionSpec, parseSchema, parseSchemaPayload} from '../src/parse-schema.js'

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

const LEGACY_SPEC = {columns: [{header: 'Total', jsonPath: '$.total'}]}
const MULTI_SHEET_SPEC = {
  sheets: [
    {columns: [{header: 'Total', jsonPath: '$.total'}], name: 'Header'},
    {columns: [{header: 'Item', jsonPath: '$.items[*].name'}], name: 'Items'},
  ],
}

describe('parseConversionSpec', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExistsSync.mockReturnValue(false)
  })

  it('parses an inline legacy spec', () => {
    expect(parseConversionSpec(JSON.stringify(LEGACY_SPEC))).toEqual(LEGACY_SPEC)
  })

  it('parses an inline multi-sheet spec', () => {
    expect(parseConversionSpec(JSON.stringify(MULTI_SHEET_SPEC))).toEqual(MULTI_SHEET_SPEC)
  })

  it('accepts an empty columns array', () => {
    expect(parseConversionSpec('{"columns":[]}')).toEqual({columns: []})
  })

  it('reads a bare spec from a file', () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue(JSON.stringify(MULTI_SHEET_SPEC))

    expect(parseConversionSpec('spec.json')).toEqual(MULTI_SHEET_SPEC)
    expect(mockReadFileSync).toHaveBeenCalledWith('spec.json', 'utf8')
  })

  it('extracts conversionSpec from a full export payload', () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue(
      JSON.stringify({codeType: 'factura', conversionSpec: LEGACY_SPEC, jsonSchema: {type: 'object'}}),
    )

    expect(parseConversionSpec('factura.json')).toEqual(LEGACY_SPEC)
  })

  it('rejects an export payload whose conversionSpec is null', () => {
    const payload = JSON.stringify({codeType: 'factura', conversionSpec: null, jsonSchema: {type: 'object'}})
    expect(() => parseConversionSpec(payload)).toThrow('expected an object with "columns" or "sheets"')
  })

  it('rejects an object without columns or sheets', () => {
    expect(() => parseConversionSpec('{"foo":1}')).toThrow('Invalid conversion spec: expected an object with "columns" or "sheets"')
  })

  it('rejects arrays', () => {
    expect(() => parseConversionSpec('[{"header":"Total"}]')).toThrow('expected an object with "columns" or "sheets"')
  })

  it('rejects scalars', () => {
    expect(() => parseConversionSpec('42')).toThrow('expected an object with "columns" or "sheets"')
  })

  it('rejects invalid JSON with a conversion-spec-specific message', () => {
    expect(() => parseConversionSpec('not-json')).toThrow('Invalid conversion spec: not a valid file path or JSON string')
  })

  it('rejects invalid JSON in a file with a conversion-spec-specific message', () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue('not valid json')

    expect(() => parseConversionSpec('bad.json')).toThrow('Invalid JSON in conversion spec file "bad.json"')
  })
})

describe('parseSchemaPayload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExistsSync.mockReturnValue(false)
  })

  it('returns only jsonSchema for a bare schema', () => {
    expect(parseSchemaPayload('{"type":"object","properties":{}}')).toEqual({
      jsonSchema: {properties: {}, type: 'object'},
    })
  })

  it('returns jsonSchema and conversionSpec from a full export payload', () => {
    const payload = {
      codeType: 'factura',
      conversionSpec: MULTI_SHEET_SPEC,
      id: 'dt_123',
      jsonSchema: {properties: {total: {type: 'number'}}, type: 'object'},
    }
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue(JSON.stringify(payload))

    expect(parseSchemaPayload('factura.json')).toEqual({
      conversionSpec: MULTI_SHEET_SPEC,
      jsonSchema: payload.jsonSchema,
    })
  })

  it('omits conversionSpec when the export payload has it as null', () => {
    const payload = {codeType: 'factura', conversionSpec: null, jsonSchema: {type: 'object'}}
    expect(parseSchemaPayload(JSON.stringify(payload))).toEqual({jsonSchema: {type: 'object'}})
  })

  it('omits conversionSpec when the export payload lacks the key', () => {
    const payload = {codeType: 'factura', jsonSchema: {type: 'object'}}
    expect(parseSchemaPayload(JSON.stringify(payload))).toEqual({jsonSchema: {type: 'object'}})
  })

  it('ignores a top-level conversionSpec on a bare schema', () => {
    // Not a wrapped payload: the object itself is the schema, so a stray
    // conversionSpec key belongs to the schema and must not be lifted out.
    const schema = {conversionSpec: LEGACY_SPEC, properties: {}, type: 'object'}
    expect(parseSchemaPayload(JSON.stringify(schema))).toEqual({jsonSchema: schema})
  })

  it('forwards an embedded spec shape it does not recognize, verbatim', () => {
    // The payload came from the API: an unknown shape must round-trip rather
    // than block the create. The API validates it and is the source of truth.
    const payload = {conversionSpec: {tables: [{name: 'Items'}]}, jsonSchema: {type: 'object'}}

    expect(parseSchemaPayload(JSON.stringify(payload))).toEqual({
      conversionSpec: {tables: [{name: 'Items'}]},
      jsonSchema: {type: 'object'},
    })
  })

  it('omits a non-object embedded spec', () => {
    const payload = {conversionSpec: 'not-a-spec', jsonSchema: {type: 'object'}}
    expect(parseSchemaPayload(JSON.stringify(payload))).toEqual({jsonSchema: {type: 'object'}})
  })

  it('keeps parseSchema error messages', () => {
    expect(() => parseSchemaPayload('[1,2,3]')).toThrow('JSON schema must be an object')
  })
})
