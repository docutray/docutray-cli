import {describe, expect, it, vi, beforeEach} from 'vitest'

vi.mock('../../../src/client.js', () => ({
  createClient: vi.fn(),
}))

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => ''),
}))

import {existsSync, readFileSync} from 'node:fs'
import {createClient} from '../../../src/client.js'
import TypesCreate from '../../../src/commands/types/create.js'

const mockCreateClient = vi.mocked(createClient)
const mockExistsSync = vi.mocked(existsSync)
const mockReadFileSync = vi.mocked(readFileSync)

const mockResult = {
  codeType: 'invoice',
  description: 'Standard invoice',
  id: 'dt_123',
  isDraft: true,
  isPublic: false,
  name: 'Invoice',
}

function mockClient() {
  const client = {
    documentTypes: {
      create: vi.fn().mockResolvedValue(mockResult),
    },
  }
  mockCreateClient.mockReturnValue(client as any)
  return client
}

describe('types create', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let exitSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockExistsSync.mockReturnValue(false)
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    exitSpy = vi.spyOn(TypesCreate.prototype, 'exit').mockImplementation(() => {
      throw new Error('EXIT')
    })
  })

  it('creates a document type with inline schema', async () => {
    const client = mockClient()
    const schema = '{"type":"object","properties":{"total":{"type":"number"}}}'

    await TypesCreate.run(['--name', 'Invoice', '--code', 'invoice', '--description', 'Standard invoice', '--schema', schema])

    expect(client.documentTypes.create).toHaveBeenCalledWith({
      codeType: 'invoice',
      conversionMode: undefined,
      description: 'Standard invoice',
      identifyPromptHints: undefined,
      isDraft: true,
      jsonSchema: JSON.parse(schema),
      keepPropertyOrdering: undefined,
      name: 'Invoice',
      promptHints: undefined,
    })
    expect(stdoutSpy).toHaveBeenCalled()
  })

  it('creates a document type from a schema file', async () => {
    const client = mockClient()
    const schemaContent = '{"type":"object","properties":{"amount":{"type":"number"}}}'
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue(schemaContent)

    await TypesCreate.run(['--name', 'Invoice', '--code', 'invoice', '--description', 'Standard invoice', '--schema', 'schema.json'])

    expect(mockReadFileSync).toHaveBeenCalledWith('schema.json', 'utf8')
    expect(client.documentTypes.create).toHaveBeenCalledWith(
      expect.objectContaining({
        jsonSchema: JSON.parse(schemaContent),
      }),
    )
  })

  it('publishes immediately with --publish', async () => {
    const client = mockClient()
    client.documentTypes.create.mockResolvedValue({...mockResult, isDraft: false})

    await TypesCreate.run(['--name', 'Invoice', '--code', 'invoice', '--description', 'Standard invoice', '--schema', '{"type":"object"}', '--publish'])

    expect(client.documentTypes.create).toHaveBeenCalledWith(
      expect.objectContaining({isDraft: false}),
    )
  })

  it('passes optional flags', async () => {
    const client = mockClient()

    await TypesCreate.run([
      '--name', 'Invoice',
      '--code', 'invoice',
      '--description', 'Standard invoice',
      '--schema', '{"type":"object"}',
      '--prompt-hints', 'Use ISO dates',
      '--identify-hints', 'Look for invoice number',
      '--conversion-mode', 'toon',
      '--keep-ordering',
    ])

    expect(client.documentTypes.create).toHaveBeenCalledWith(
      expect.objectContaining({
        conversionMode: 'toon',
        identifyPromptHints: 'Look for invoice number',
        keepPropertyOrdering: true,
        promptHints: 'Use ISO dates',
      }),
    )
  })

  it('fails with invalid inline JSON', async () => {
    mockClient()

    await expect(TypesCreate.run(['--name', 'Invoice', '--code', 'invoice', '--description', 'test', '--schema', 'not-json'])).rejects.toThrow('EXIT')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('not a valid file path or JSON string'))
    exitSpy.mockRestore()
  })

  it('fails with invalid JSON in schema file', async () => {
    mockClient()
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue('not valid json')

    await expect(TypesCreate.run(['--name', 'Invoice', '--code', 'invoice', '--description', 'test', '--schema', 'bad.json'])).rejects.toThrow('EXIT')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid JSON in schema file'))
    exitSpy.mockRestore()
  })

  it('fails when schema is an array', async () => {
    mockClient()

    await expect(TypesCreate.run(['--name', 'Invoice', '--code', 'invoice', '--description', 'test', '--schema', '[1,2,3]'])).rejects.toThrow('EXIT')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('JSON schema must be an object'))
    exitSpy.mockRestore()
  })

  it('handles API errors', async () => {
    const client = mockClient()
    client.documentTypes.create.mockRejectedValue(new Error('codeType ya está en uso'))

    await expect(TypesCreate.run(['--name', 'Invoice', '--code', 'invoice', '--description', 'test', '--schema', '{"type":"object"}'])).rejects.toThrow('EXIT')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('ya está en uso'))
    exitSpy.mockRestore()
  })
})
