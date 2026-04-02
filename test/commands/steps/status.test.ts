import {describe, expect, it, vi, beforeEach} from 'vitest'

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
    const statusResult = {id: 'exec-1', status: 'SUCCESS', data: {extracted: true}}
    mockCreateClient.mockReturnValue({
      steps: {getStatus: vi.fn().mockResolvedValue(statusResult)},
    } as any)

    await StepsStatus.run(['exec-1'])

    expect(stdoutSpy).toHaveBeenCalledWith(
      expect.stringContaining('"status": "SUCCESS"'),
    )
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
