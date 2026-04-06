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

function mockClient() {
  const client = {
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
})
