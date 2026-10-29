import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

vi.mock('../../../src/client.js', () => ({
  createClient: vi.fn(),
}))

import {createClient} from '../../../src/client.js'
import StepsStatus from '../../../src/commands/steps/status.js'

const mockCreateClient = vi.mocked(createClient)

describe('steps status', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let stderrSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
  })

  it('queries execution status and outputs JSON', async () => {
    const statusResult = {execution_id: 'exec-1', status: 'SUCCESS', data: {extracted: true}}
    mockCreateClient.mockReturnValue({
      steps: {getStatus: vi.fn().mockResolvedValue(statusResult)},
    } as any)

    await StepsStatus.run(['exec-1'])

    expect(stdoutSpy).toHaveBeenCalledWith(
      expect.stringContaining('"status": "SUCCESS"'),
    )
  })

  describe('in a TTY', () => {
    let originalStdoutTTY: boolean | undefined

    beforeEach(() => {
      originalStdoutTTY = process.stdout.isTTY
      Object.defineProperty(process.stdout, 'isTTY', {value: true, writable: true})
    })

    afterEach(() => {
      Object.defineProperty(process.stdout, 'isTTY', {value: originalStdoutTTY, writable: true})
    })

    it('shows the execution_id returned by the API', async () => {
      mockCreateClient.mockReturnValue({
        steps: {getStatus: vi.fn().mockResolvedValue({execution_id: 'exec-from-api', status: 'SUCCESS'})},
      } as any)

      await StepsStatus.run(['exec-1'])

      const output = stdoutSpy.mock.calls.map((c: any) => c[0]).join('')
      expect(output).toContain('Execution ID:  exec-from-api')
    })

    it('shows the error message of a failed execution', async () => {
      mockCreateClient.mockReturnValue({
        steps: {
          getStatus: vi.fn().mockResolvedValue({
            execution_id: 'exec-1',
            status: 'ERROR',
            error: {message: 'Extraction failed', phase: 'conversion'},
          }),
        },
      } as any)

      await StepsStatus.run(['exec-1'])

      const output = stdoutSpy.mock.calls.map((c: any) => c[0]).join('')
      expect(output).toContain('Error:  Extraction failed')
      expect(output).not.toContain('[object Object]')
    })
  })

  it('outputs error when no API key is configured', async () => {
    mockCreateClient.mockImplementation(() => {
      throw new Error('No API key configured. Run "docutray login" or set DOCUTRAY_API_KEY environment variable.')
    })

    const exitSpy = vi.spyOn(StepsStatus.prototype, 'exit').mockImplementation(() => {
      throw new Error('EXIT')
    })

    await expect(StepsStatus.run(['exec-1'])).rejects.toThrow('EXIT')

    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('No API key configured'),
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
    exitSpy.mockRestore()
  })

  it('outputs error on invalid execution ID', async () => {
    mockCreateClient.mockReturnValue({
      steps: {getStatus: vi.fn().mockRejectedValue(new Error('Not found'))},
    } as any)

    const exitSpy = vi.spyOn(StepsStatus.prototype, 'exit').mockImplementation(() => {
      throw new Error('EXIT')
    })

    await expect(StepsStatus.run(['invalid-id'])).rejects.toThrow('EXIT')

    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('Not found'),
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
    exitSpy.mockRestore()
  })
})
