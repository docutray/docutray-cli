import {describe, expect, it, vi, beforeEach} from 'vitest'

vi.mock('../../../src/client.js', () => ({
  createClient: vi.fn(),
}))

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
  statSync: vi.fn(() => ({isDirectory: () => false})),
  writeFileSync: vi.fn(),
}))

import {existsSync, statSync} from 'node:fs'
import {createClient} from '../../../src/client.js'
import TypesExport from '../../../src/commands/types/export.js'

const mockCreateClient = vi.mocked(createClient)
const mockExistsSync = vi.mocked(existsSync)
const mockStatSync = vi.mocked(statSync)

function mockClient() {
  const client = {
    documentTypes: {
      get: vi.fn().mockResolvedValue({codeType: 'invoice', name: 'Invoice', fields: []}),
      list: vi.fn().mockResolvedValue({
        data: [{codeType: 'invoice', id: 'cmnp1nxdb004s01tm5gxakfdl', name: 'Invoice'}],
      }),
    },
  }
  mockCreateClient.mockReturnValue(client as any)
  return client
}

describe('types export --force', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let exitSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockExistsSync.mockReturnValue(false)
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    exitSpy = vi.spyOn(TypesExport.prototype, 'exit').mockImplementation(() => {
      throw new Error('EXIT')
    })
  })

  it('resolves codeType to id before calling get', async () => {
    const client = mockClient()
    await TypesExport.run(['invoice'])
    expect(client.documentTypes.list).toHaveBeenCalledWith({search: 'invoice', page: 1, limit: 100})
    expect(client.documentTypes.get).toHaveBeenCalledWith('cmnp1nxdb004s01tm5gxakfdl')
  })

  it('rejects overwriting existing file without --force', async () => {
    mockClient()
    mockExistsSync.mockReturnValue(true)
    await expect(TypesExport.run(['invoice', '-o', 'existing.json'])).rejects.toThrow('EXIT')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('File already exists: existing.json. Use --force to overwrite.'))
    exitSpy.mockRestore()
  })

  it('allows overwriting existing file with --force', async () => {
    mockClient()
    mockExistsSync.mockReturnValue(true)
    await TypesExport.run(['invoice', '-o', 'existing.json', '--force'])
    expect(stdoutSpy).toHaveBeenCalled()
  })

  it('writes new file without --force', async () => {
    mockClient()
    mockExistsSync.mockReturnValue(false)
    await TypesExport.run(['invoice', '-o', 'new.json'])
    expect(stdoutSpy).toHaveBeenCalled()
  })

  it('rejects directory as output path', async () => {
    mockClient()
    mockExistsSync.mockReturnValue(true)
    mockStatSync.mockReturnValue({isDirectory: () => true} as any)
    await expect(TypesExport.run(['invoice', '-o', './some-dir'])).rejects.toThrow('EXIT')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Output path is a directory: ./some-dir'))
    exitSpy.mockRestore()
  })
})
