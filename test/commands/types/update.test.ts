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
import TypesUpdate from '../../../src/commands/types/update.js'

const mockCreateClient = vi.mocked(createClient)
const mockExistsSync = vi.mocked(existsSync)
const mockReadFileSync = vi.mocked(readFileSync)

const mockResult = {
  codeType: 'invoice',
  description: 'Updated invoice',
  id: 'dt_123',
  isDraft: false,
  isPublic: false,
  name: 'Updated Invoice',
}

function mockClient() {
  const client = {
    documentTypes: {
      update: vi.fn().mockResolvedValue(mockResult),
    },
  }
  mockCreateClient.mockReturnValue(client as any)
  return client
}

describe('types update', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let exitSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockExistsSync.mockReturnValue(false)
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    exitSpy = vi.spyOn(TypesUpdate.prototype, 'exit').mockImplementation(() => {
      throw new Error('EXIT')
    })
  })

  it('updates the name', async () => {
    const client = mockClient()

    await TypesUpdate.run(['invoice', '--name', 'Updated Invoice'])

    expect(client.documentTypes.update).toHaveBeenCalledWith('invoice', {name: 'Updated Invoice'})
    expect(stdoutSpy).toHaveBeenCalled()
  })

  it('updates the schema from a file', async () => {
    const client = mockClient()
    const schemaContent = '{"type":"object","properties":{"amount":{"type":"number"}}}'
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue(schemaContent)

    await TypesUpdate.run(['invoice', '--schema', 'new-schema.json'])

    expect(mockReadFileSync).toHaveBeenCalledWith('new-schema.json', 'utf8')
    expect(client.documentTypes.update).toHaveBeenCalledWith('invoice', {
      jsonSchema: JSON.parse(schemaContent),
    })
  })

  it('updates multiple fields at once', async () => {
    const client = mockClient()

    await TypesUpdate.run([
      'invoice',
      '--name', 'New Name',
      '--description', 'New description',
      '--prompt-hints', 'Use ISO dates',
      '--conversion-mode', 'toon',
    ])

    expect(client.documentTypes.update).toHaveBeenCalledWith('invoice', {
      conversionMode: 'toon',
      description: 'New description',
      name: 'New Name',
      promptHints: 'Use ISO dates',
    })
  })

  it('publishes with --publish', async () => {
    const client = mockClient()

    await TypesUpdate.run(['invoice', '--publish'])

    expect(client.documentTypes.update).toHaveBeenCalledWith('invoice', {isDraft: false})
  })

  it('sets draft with --draft', async () => {
    const client = mockClient()

    await TypesUpdate.run(['invoice', '--draft'])

    expect(client.documentTypes.update).toHaveBeenCalledWith('invoice', {isDraft: true})
  })

  it('fails without any update flags', async () => {
    mockClient()

    await expect(TypesUpdate.run(['invoice'])).rejects.toThrow('EXIT')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('At least one field to update must be provided'))
    exitSpy.mockRestore()
  })

  it('fails with invalid schema JSON', async () => {
    mockClient()

    await expect(TypesUpdate.run(['invoice', '--schema', 'not-json'])).rejects.toThrow('EXIT')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('not a valid file path or JSON string'))
    exitSpy.mockRestore()
  })

  it('handles API errors', async () => {
    const client = mockClient()
    client.documentTypes.update.mockRejectedValue(new Error('Document type not found'))

    await expect(TypesUpdate.run(['invoice', '--name', 'Test'])).rejects.toThrow('EXIT')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Document type not found'))
    exitSpy.mockRestore()
  })
})
