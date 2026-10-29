import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

vi.mock('../../../src/client.js', () => ({
  createClient: vi.fn(),
}))

import {createClient} from '../../../src/client.js'
import ConvertStatus from '../../../src/commands/convert/status.js'

const mockCreateClient = vi.mocked(createClient)

const successStatus = {
  conversion_id: 'conv_abc123',
  status: 'SUCCESS',
  status_url: null,
  request_timestamp: '2026-10-28T10:00:00Z',
  response_timestamp: '2026-10-28T10:00:05Z',
  document_type_code: 'invoice',
  original_filename: 'invoice.pdf',
  data: {total: 100},
  error: null,
  validation: {
    valid: false,
    errors: [{field: 'total', code: 'VALIDATION_ERROR', message: 'total debe ser mayor a 1000', severity: 'error', source: 'rule', rule: 'min_total'}],
    warnings: [{field: '', code: 'MISSING_FIELD', message: 'falta la fecha', severity: 'warning', source: 'schema'}],
  },
}

function mockClient(status: Record<string, unknown> = successStatus) {
  const client = {convert: {getStatus: vi.fn().mockResolvedValue(status)}}
  mockCreateClient.mockReturnValue(client as any)
  return client
}

describe('convert status', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let stderrSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
  })

  it('queries the conversion and outputs the full status as JSON', async () => {
    const client = mockClient()

    await ConvertStatus.run(['conv_abc123'])

    expect(client.convert.getStatus).toHaveBeenCalledWith('conv_abc123')
    const output = JSON.parse(stdoutSpy.mock.calls.map((c: any) => c[0]).join(''))
    expect(output.validation.valid).toBe(false)
    expect(output.data).toEqual({total: 100})
  })

  it('outputs error on unknown conversion ID', async () => {
    mockCreateClient.mockReturnValue({
      convert: {getStatus: vi.fn().mockRejectedValue(new Error('Conversion not found'))},
    } as any)
    const exitSpy = vi.spyOn(ConvertStatus.prototype, 'exit').mockImplementation(() => {
      throw new Error('EXIT')
    })

    await expect(ConvertStatus.run(['missing'])).rejects.toThrow('EXIT')

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Conversion not found'))
    expect(exitSpy).toHaveBeenCalledWith(1)
    exitSpy.mockRestore()
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

    function stdout(): string {
      return stdoutSpy.mock.calls.map((c: any) => c[0]).join('')
    }

    it('shows status, validation issues and data', async () => {
      mockClient()

      await ConvertStatus.run(['conv_abc123'])

      expect(stdout()).toContain('Conversion ID:  conv_abc123')
      expect(stdout()).toContain('✓ Status:  SUCCESS')
      expect(stdout()).toContain('Validation:  ✗ invalid (1 error, 1 warning)')
      expect(stdout()).toContain('✗ total: total debe ser mayor a 1000 [VALIDATION_ERROR, rule: min_total]')
      expect(stdout()).toContain('⚠ (root): falta la fecha [MISSING_FIELD, schema]')
      expect(stdout()).toContain('"total": 100')
    })

    it('shows a skipped validation', async () => {
      mockClient({...successStatus, validation: null})
      await ConvertStatus.run(['conv_abc123'])
      expect(stdout()).toContain('Validation:  skipped')
    })

    it('shows a validation that could not be completed', async () => {
      mockClient({...successStatus, validation: {status: 'error'}})
      await ConvertStatus.run(['conv_abc123'])
      expect(stdout()).toContain('Validation:  ⚠ could not be completed')
    })

    it('omits the validation block when the API does not send it', async () => {
      const {validation: _validation, ...withoutValidation} = successStatus
      mockClient({...withoutValidation, status: 'PROCESSING', data: null})
      await ConvertStatus.run(['conv_abc123'])
      expect(stdout()).toContain('○ Status:  PROCESSING')
      expect(stdout()).not.toContain('Validation:')
      expect(stdout()).not.toContain('Data:')
    })

    it('shows the error of a failed conversion', async () => {
      mockClient({...successStatus, status: 'ERROR', data: null, validation: undefined, error: 'Document unreadable'})
      await ConvertStatus.run(['conv_abc123'])
      expect(stdout()).toContain('✗ Status:  ERROR')
      expect(stdout()).toContain('Error:  Document unreadable')
    })
  })
})
