import {describe, expect, it, vi, beforeEach} from 'vitest'

vi.mock('../../src/client.js', () => ({
  createClient: vi.fn(),
}))

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => true),
  readFileSync: vi.fn(() => Buffer.from('fake-pdf-content')),
  statSync: vi.fn(() => ({isDirectory: () => false})),
}))

import {existsSync} from 'node:fs'
import {createClient} from '../../src/client.js'
import Identify from '../../src/commands/identify.js'

const mockCreateClient = vi.mocked(createClient)
const mockExistsSync = vi.mocked(existsSync)

function mockClient(typeCodes: string[] = ['invoice', 'receipt']) {
  const client = {
    documentTypes: {
      list: vi.fn().mockResolvedValue({data: typeCodes.map((codeType) => ({codeType}))}),
    },
    identify: {
      run: vi.fn().mockResolvedValue({document_type: {code: 'invoice', name: 'Invoice', confidence: 0.95}}),
      runAsync: vi.fn(),
    },
  }
  mockCreateClient.mockReturnValue(client as any)
  return client
}

describe('identify validation', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let exitSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockExistsSync.mockReturnValue(true)
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    exitSpy = vi.spyOn(Identify.prototype, 'exit').mockImplementation(() => {
      throw new Error('EXIT')
    })
  })

  it('rejects nonexistent source file', async () => {
    mockClient()
    mockExistsSync.mockReturnValue(false)
    await expect(Identify.run(['nonexistent.pdf'])).rejects.toThrow('EXIT')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('File not found: nonexistent.pdf'))
    exitSpy.mockRestore()
  })

  it('accepts URL source without file check', async () => {
    const client = mockClient()
    await Identify.run(['https://example.com/doc.pdf'])
    expect(client.identify.run).toHaveBeenCalledWith(expect.objectContaining({url: 'https://example.com/doc.pdf'}))
  })

  it('uses all document types of the organization when --types is omitted', async () => {
    const client = mockClient(['invoice', 'receipt'])
    await Identify.run(['https://example.com/doc.pdf'])
    expect(client.documentTypes.list).toHaveBeenCalledWith({page: 1, limit: 100})
    expect(client.identify.run).toHaveBeenCalledWith(
      expect.objectContaining({documentTypeCodeOptions: ['invoice', 'receipt']}),
    )
  })

  it('walks every page of document types', async () => {
    const client = mockClient()
    const firstPage = Array.from({length: 100}, (_, i) => ({codeType: `type-${i}`}))
    client.documentTypes.list
      .mockResolvedValueOnce({data: firstPage})
      .mockResolvedValueOnce({data: [{codeType: 'last'}]})

    await Identify.run(['https://example.com/doc.pdf'])

    expect(client.documentTypes.list).toHaveBeenCalledTimes(2)
    expect(client.documentTypes.list).toHaveBeenLastCalledWith({page: 2, limit: 100})
    const options = client.identify.run.mock.calls[0]![0].documentTypeCodeOptions
    expect(options).toHaveLength(101)
    expect(options.at(-1)).toBe('last')
  })

  it('fails with a clear error when the organization has no document types', async () => {
    const client = mockClient([])
    await expect(Identify.run(['https://example.com/doc.pdf'])).rejects.toThrow('EXIT')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('No document types found in your organization'))
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(client.identify.run).not.toHaveBeenCalled()
  })

  it('sends only the --types codes without listing document types', async () => {
    const client = mockClient()
    await Identify.run(['https://example.com/doc.pdf', '--types', 'invoice, contract'])
    expect(client.documentTypes.list).not.toHaveBeenCalled()
    expect(client.identify.run).toHaveBeenCalledWith(
      expect.objectContaining({documentTypeCodeOptions: ['invoice', 'contract']}),
    )
  })
})
