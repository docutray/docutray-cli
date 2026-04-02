import {describe, expect, it, vi, beforeEach} from 'vitest'

// Mock modules before imports
vi.mock('../../../src/client.js', () => ({
  createClient: vi.fn(),
}))

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(() => Buffer.from('fake-pdf-content')),
}))

import {createClient} from '../../../src/client.js'
import StepsRun from '../../../src/commands/steps/run.js'

const mockCreateClient = vi.mocked(createClient)

function mockClient(waitResult: Record<string, unknown> = {id: 'exec-1', status: 'SUCCESS', data: {key: 'value'}}) {
  const mockWait = vi.fn().mockResolvedValue(waitResult)
  const initialStatus = {id: 'exec-1', status: 'ENQUEUED', wait: mockWait}
  const client = {
    steps: {
      runAsync: vi.fn().mockResolvedValue(initialStatus),
    },
  }
  mockCreateClient.mockReturnValue(client as any)
  return {client, mockWait, initialStatus}
}

describe('steps run', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>
  let stdoutSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  it('runs a step with a local file and polls to completion', async () => {
    const {client} = mockClient()

    await StepsRun.run(['my-step', 'invoice.pdf'])

    expect(client.steps.runAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        stepId: 'my-step',
        filename: 'invoice.pdf',
      }),
    )
    expect(stdoutSpy).toHaveBeenCalledWith(
      expect.stringContaining('"status": "SUCCESS"'),
    )
  })

  it('runs a step with a URL', async () => {
    const {client} = mockClient()

    await StepsRun.run(['my-step', 'https://example.com/doc.pdf'])

    expect(client.steps.runAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        stepId: 'my-step',
        url: 'https://example.com/doc.pdf',
      }),
    )
  })

  it('passes metadata when provided', async () => {
    const {client} = mockClient()

    await StepsRun.run(['my-step', 'doc.pdf', '--metadata', '{"key":"value"}'])

    expect(client.steps.runAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        documentMetadata: {key: 'value'},
      }),
    )
  })

  it('passes webhook URL when provided', async () => {
    const {client} = mockClient()

    await StepsRun.run(['my-step', 'doc.pdf', '--webhook-url', 'https://hook.example.com'])

    expect(client.steps.runAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        webhookUrl: 'https://hook.example.com',
      }),
    )
  })

  it('returns immediately with --no-wait', async () => {
    const {mockWait} = mockClient()

    await StepsRun.run(['my-step', 'doc.pdf', '--no-wait'])

    expect(mockWait).not.toHaveBeenCalled()
    expect(stdoutSpy).toHaveBeenCalledWith(
      expect.stringContaining('"status": "ENQUEUED"'),
    )
  })

  it('outputs error when no API key is configured', async () => {
    mockCreateClient.mockImplementation(() => {
      throw new Error('No API key configured. Run "docutray login" or set DOCUTRAY_API_KEY environment variable.')
    })

    const exitSpy = vi.spyOn(StepsRun.prototype, 'exit').mockImplementation(() => {
      throw new Error('EXIT')
    })

    await expect(StepsRun.run(['my-step', 'doc.pdf'])).rejects.toThrow('EXIT')

    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('No API key configured'),
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
    exitSpy.mockRestore()
  })

  it('emits status updates to stderr during polling', async () => {
    const waitResult = {id: 'exec-1', status: 'SUCCESS', data: {key: 'value'}}
    const mockWait = vi.fn().mockImplementation(async (options: {onStatus: (s: {status: string}) => void}) => {
      options.onStatus({status: 'PROCESSING'})
      options.onStatus({status: 'PROCESSING'})
      return waitResult
    })
    const initialStatus = {id: 'exec-1', status: 'ENQUEUED', wait: mockWait}
    mockCreateClient.mockReturnValue({
      steps: {runAsync: vi.fn().mockResolvedValue(initialStatus)},
    } as any)

    await StepsRun.run(['my-step', 'doc.pdf'])

    expect(stderrSpy).toHaveBeenCalledWith('{"status":"PROCESSING"}\n')
    expect(stdoutSpy).toHaveBeenCalledWith(
      expect.stringContaining('"status": "SUCCESS"'),
    )
  })

  it('outputs error to stderr on failure', async () => {
    mockCreateClient.mockReturnValue({
      steps: {
        runAsync: vi.fn().mockRejectedValue(new Error('Step not found')),
      },
    } as any)

    const exitSpy = vi.spyOn(StepsRun.prototype, 'exit').mockImplementation(() => {
      throw new Error('EXIT')
    })

    await expect(StepsRun.run(['bad-step', 'doc.pdf'])).rejects.toThrow('EXIT')

    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('Step not found'),
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
    exitSpy.mockRestore()
  })
})
