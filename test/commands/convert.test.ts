import {describe, expect, it, vi, beforeEach} from 'vitest'

vi.mock('../../src/client.js', () => ({
  createClient: vi.fn(),
}))

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => true),
  readFileSync: vi.fn(() => Buffer.from('fake-pdf-content')),
  statSync: vi.fn(() => ({isDirectory: () => false})),
}))

import {existsSync, statSync} from 'node:fs'
import {createClient} from '../../src/client.js'
import Convert from '../../src/commands/convert.js'

const mockCreateClient = vi.mocked(createClient)
const mockExistsSync = vi.mocked(existsSync)
const mockStatSync = vi.mocked(statSync)

function mockClient() {
  const client = {
    convert: {
      run: vi.fn().mockResolvedValue({id: 'conv-1', status: 'SUCCESS'}),
      runAsync: vi.fn().mockResolvedValue({
        id: 'conv-1',
        status: 'ENQUEUED',
        wait: vi.fn().mockResolvedValue({id: 'conv-1', status: 'SUCCESS'}),
      }),
    },
  }
  mockCreateClient.mockReturnValue(client as any)
  return client
}

describe('convert validation', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let exitSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockExistsSync.mockReturnValue(true)
    mockStatSync.mockReturnValue({isDirectory: () => false} as any)
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    exitSpy = vi.spyOn(Convert.prototype, 'exit').mockImplementation(() => {
      throw new Error('EXIT')
    })
  })

  it('rejects malformed JSON in --metadata', async () => {
    mockClient()
    await expect(Convert.run(['file.pdf', '-t', 'inv', '--metadata', '{"bad'])).rejects.toThrow('EXIT')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid JSON in --metadata'))
    exitSpy.mockRestore()
  })

  it('rejects invalid --webhook-url', async () => {
    mockClient()
    await expect(Convert.run(['file.pdf', '-t', 'inv', '--webhook-url', 'not-a-url'])).rejects.toThrow('EXIT')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid URL in --webhook-url'))
    exitSpy.mockRestore()
  })

  it('rejects non-http protocol in --webhook-url', async () => {
    mockClient()
    await expect(Convert.run(['file.pdf', '-t', 'inv', '--webhook-url', 'ftp://example.com'])).rejects.toThrow('EXIT')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('must use http or https protocol'))
    exitSpy.mockRestore()
  })

  it('rejects nonexistent source file', async () => {
    mockClient()
    mockExistsSync.mockReturnValue(false)
    await expect(Convert.run(['nonexistent.pdf', '-t', 'inv'])).rejects.toThrow('EXIT')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('File not found: nonexistent.pdf'))
    exitSpy.mockRestore()
  })

  it('rejects directory as source', async () => {
    mockClient()
    mockExistsSync.mockReturnValue(true)
    mockStatSync.mockReturnValue({isDirectory: () => true} as any)
    await expect(Convert.run(['./some-dir', '-t', 'inv'])).rejects.toThrow('EXIT')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Expected a file, got a directory'))
    exitSpy.mockRestore()
  })

  it('accepts URL source without file check', async () => {
    const client = mockClient()
    await Convert.run(['https://example.com/doc.pdf', '-t', 'inv'])
    expect(client.convert.run).toHaveBeenCalledWith(expect.objectContaining({url: 'https://example.com/doc.pdf'}))
  })
})
