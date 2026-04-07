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
      get: vi.fn().mockResolvedValue({
        codeType: 'invoice',
        description: 'Standard invoice',
        fields: [{name: 'total'}],
        isDraft: false,
        isPublic: true,
        name: 'Invoice',
      }),
      list: vi.fn().mockResolvedValue({
        data: [{codeType: 'invoice', id: 'cmnp1nxdb004s01tm5gxakfdl', name: 'Invoice'}],
      }),
    },
  }
  mockCreateClient.mockReturnValue(client as any)
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

  it('displays key-value output', async () => {
    mockClient()

    await TypesGet.run(['invoice'])

    expect(stdoutSpy).toHaveBeenCalled()
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
