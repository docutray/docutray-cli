import {describe, expect, it, vi, beforeEach} from 'vitest'

vi.mock('../../../src/client.js', () => ({
  createClient: vi.fn(),
}))

import {createClient} from '../../../src/client.js'
import TypesGet from '../../../src/commands/types/get.js'

const mockCreateClient = vi.mocked(createClient)

function mockClient() {
  const client = {
    documentTypes: {
      // SDK 0.1.3+: documentTypes.get returns the unwrapped DocumentType
      // (no `{data: ...}` wrapper) and includes `jsonSchema`.
      get: vi.fn().mockResolvedValue({
        codeType: 'invoice',
        createdAt: '2026-01-01T00:00:00.000Z',
        description: 'Standard invoice',
        id: 'cmnp1nxdb004s01tm5gxakfdl',
        isDraft: false,
        isPublic: true,
        jsonSchema: {
          properties: {
            issuer: {type: 'string'},
            total: {type: 'number'},
          },
          type: 'object',
        },
        name: 'Invoice',
        status: 'PUBLISHED',
        updatedAt: '2026-01-02T00:00:00.000Z',
      }),
      list: vi.fn().mockResolvedValue({
        data: [{codeType: 'invoice', id: 'cmnp1nxdb004s01tm5gxakfdl', name: 'Invoice'}],
      }),
    },
  }
  mockCreateClient.mockReturnValue(client as never)
  return client
}

describe('types get', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let exitSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    exitSpy = vi.spyOn(TypesGet.prototype, 'exit').mockImplementation(() => {
      throw new Error('EXIT')
    })
  })

  it('resolves codeType to id before calling get', async () => {
    const client = mockClient()

    await TypesGet.run(['invoice'])

    expect(client.documentTypes.list).toHaveBeenCalledWith({search: 'invoice', page: 1, limit: 100})
    expect(client.documentTypes.get).toHaveBeenCalledWith('cmnp1nxdb004s01tm5gxakfdl')
  })

  it('passes internal id directly without lookup', async () => {
    const client = mockClient()

    await TypesGet.run(['cmnp1nxdb004s01tm5gxakfdl'])

    expect(client.documentTypes.list).not.toHaveBeenCalled()
    expect(client.documentTypes.get).toHaveBeenCalledWith('cmnp1nxdb004s01tm5gxakfdl')
  })

  it('displays key-value output in TTY with real values (no undefined leaks)', async () => {
    mockClient()
    const originalIsTTY = process.stdout.isTTY
    Object.defineProperty(process.stdout, 'isTTY', {configurable: true, value: true})

    try {
      await TypesGet.run(['invoice'])

      const stdoutOutput = stdoutSpy.mock.calls.map(([msg]) => String(msg)).join('')
      expect(stdoutOutput).toContain('invoice')
      expect(stdoutOutput).toContain('Invoice')
      expect(stdoutOutput).toContain('Standard invoice')
      expect(stdoutOutput).toMatch(/Schema:\s+2 top-level fields/)
      expect(stdoutOutput).not.toContain('undefined')
    } finally {
      Object.defineProperty(process.stdout, 'isTTY', {configurable: true, value: originalIsTTY})
    }
  })

  it('emits flat JSON (no data wrapper) including jsonSchema when --json is set', async () => {
    mockClient()

    await TypesGet.run(['invoice', '--json'])

    const stdoutOutput = stdoutSpy.mock.calls.map(([msg]) => String(msg)).join('')
    const parsed = JSON.parse(stdoutOutput)
    expect(parsed).not.toHaveProperty('data')
    expect(parsed.codeType).toBe('invoice')
    expect(parsed.jsonSchema).toBeDefined()
    expect(parsed.jsonSchema.properties).toHaveProperty('total')
  })

  it('shows error when codeType not found', async () => {
    const client = mockClient()
    client.documentTypes.list.mockResolvedValue({data: []})

    await expect(TypesGet.run(['nonexistent'])).rejects.toThrow('EXIT')
    const stderrOutput = stderrSpy.mock.calls.map(([msg]) => msg).join('')
    expect(stderrOutput).toContain('Document type')
    expect(stderrOutput).toContain('nonexistent')
    expect(stderrOutput).toContain('not found')
    exitSpy.mockRestore()
  })
})
