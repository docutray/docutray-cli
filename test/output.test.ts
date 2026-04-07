import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {isInteractive, outputError, outputJson, outputKeyValue, outputList, outputSuccess, setForceJson} from '../src/output.js'

describe('output', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let stderrSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    setForceJson(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('isInteractive', () => {
    it('returns false when stdout is not a TTY', () => {
      expect(isInteractive()).toBe(false)
    })

    it('returns false when forceJson is true even if TTY', () => {
      const original = process.stdout.isTTY
      Object.defineProperty(process.stdout, 'isTTY', {value: true, writable: true})
      setForceJson(true)
      expect(isInteractive()).toBe(false)
      Object.defineProperty(process.stdout, 'isTTY', {value: original, writable: true})
    })
  })

  describe('outputJson', () => {
    it('outputs pretty-printed JSON to stdout', () => {
      outputJson({key: 'value'})
      expect(stdoutSpy).toHaveBeenCalledWith('{\n  "key": "value"\n}\n')
    })
  })

  describe('outputError', () => {
    it('outputs JSON to stderr when not a TTY', () => {
      outputError(new Error('something failed'))
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('"error": "something failed"'),
      )
    })

    it('outputs human-readable to stderr when TTY', () => {
      const original = process.stderr.isTTY
      Object.defineProperty(process.stderr, 'isTTY', {value: true, writable: true})

      outputError(new Error('something failed'))
      expect(stderrSpy).toHaveBeenCalledWith('\u2717 Error: something failed\n')

      Object.defineProperty(process.stderr, 'isTTY', {value: original, writable: true})
    })

    it('includes status code in JSON output when available', () => {
      const error = Object.assign(new Error('Request failed with status 400'), {
        statusCode: 400,
        body: {error: 'El código debe comenzar con "docutraycom_"'},
        requestId: 'req_abc123',
      })
      outputError(error)
      const output = stderrSpy.mock.calls[0]![0] as string
      const parsed = JSON.parse(output)
      expect(parsed.error).toBe('El código debe comenzar con "docutraycom_"')
      expect(parsed.status).toBe(400)
      expect(parsed.requestId).toBe('req_abc123')
    })

    it('extracts body.message when body.error is not available', () => {
      const error = Object.assign(new Error('Request failed with status 422'), {
        statusCode: 422,
        body: {message: 'Validation failed'},
      })
      outputError(error)
      const output = stderrSpy.mock.calls[0]![0] as string
      const parsed = JSON.parse(output)
      expect(parsed.error).toBe('Validation failed')
      expect(parsed.status).toBe(422)
    })

    it('shows API error details with status code in TTY mode', () => {
      const original = process.stderr.isTTY
      Object.defineProperty(process.stderr, 'isTTY', {value: true, writable: true})

      const error = Object.assign(new Error('Request failed with status 400'), {
        statusCode: 400,
        body: {error: 'El código debe comenzar con "docutraycom_"'},
      })
      outputError(error)
      expect(stderrSpy).toHaveBeenCalledWith(
        '\u2717 Error: El código debe comenzar con "docutraycom_" (400)\n',
      )

      Object.defineProperty(process.stderr, 'isTTY', {value: original, writable: true})
    })

    it('falls back to error.message for non-API errors', () => {
      outputError(new Error('something failed'))
      const output = stderrSpy.mock.calls[0]![0] as string
      const parsed = JSON.parse(output)
      expect(parsed.error).toBe('something failed')
      expect(parsed.status).toBeUndefined()
      expect(parsed.requestId).toBeUndefined()
    })

    it('omits requestId from JSON when not present', () => {
      const error = Object.assign(new Error('Request failed'), {
        statusCode: 500,
        body: {error: 'Internal server error'},
      })
      outputError(error)
      const output = stderrSpy.mock.calls[0]![0] as string
      const parsed = JSON.parse(output)
      expect(parsed.requestId).toBeUndefined()
    })

    it('outputs JSON to stderr when forceJson is true even if TTY', () => {
      const original = process.stderr.isTTY
      Object.defineProperty(process.stderr, 'isTTY', {value: true, writable: true})
      setForceJson(true)

      outputError(new Error('forced json error'))
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('"error": "forced json error"'),
      )

      Object.defineProperty(process.stderr, 'isTTY', {value: original, writable: true})
    })
  })

  describe('outputKeyValue', () => {
    const data = {name: 'test', active: true}
    const entries = [
      {key: 'Name', value: 'test', icon: '\u2713'},
      {key: 'Active', value: 'yes'},
    ]

    it('outputs JSON when not a TTY (pipe mode)', () => {
      outputKeyValue(data, entries)
      expect(stdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('"name": "test"'),
      )
    })

    it('outputs key-value format when TTY', () => {
      const original = process.stdout.isTTY
      Object.defineProperty(process.stdout, 'isTTY', {value: true, writable: true})

      outputKeyValue(data, entries)
      expect(stdoutSpy).toHaveBeenCalledWith('\u2713 Name:  test\n')
      expect(stdoutSpy).toHaveBeenCalledWith('  Active:  yes\n')

      Object.defineProperty(process.stdout, 'isTTY', {value: original, writable: true})
    })

    it('respects --json flag over TTY', () => {
      const original = process.stdout.isTTY
      Object.defineProperty(process.stdout, 'isTTY', {value: true, writable: true})
      setForceJson(true)

      outputKeyValue(data, entries)
      expect(stdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('"name": "test"'),
      )

      Object.defineProperty(process.stdout, 'isTTY', {value: original, writable: true})
    })
  })

  describe('outputList', () => {
    const data = [{id: 1}, {id: 2}]
    const rows = [
      {code: 'inv', name: 'Invoice'},
      {code: 'rec', name: 'Receipt'},
    ]

    it('outputs JSON when not a TTY', () => {
      outputList(data, rows, ['code', 'name'])
      expect(stdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('"id": 1'),
      )
    })

    it('outputs table when TTY', () => {
      const original = process.stdout.isTTY
      Object.defineProperty(process.stdout, 'isTTY', {value: true, writable: true})

      outputList(data, rows, ['code', 'name'], 'Page 1 of 1')

      const output = stdoutSpy.mock.calls.map((c) => c[0]).join('')
      expect(output).toContain('CODE')
      expect(output).toContain('NAME')
      expect(output).toContain('inv')
      expect(output).toContain('Invoice')
      expect(output).toContain('Page 1 of 1')

      Object.defineProperty(process.stdout, 'isTTY', {value: original, writable: true})
    })
  })

  describe('outputSuccess', () => {
    it('outputs JSON when not a TTY', () => {
      outputSuccess({message: 'done'}, 'Operation complete')
      expect(stdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('"message": "done"'),
      )
    })

    it('outputs human message when TTY', () => {
      const original = process.stdout.isTTY
      Object.defineProperty(process.stdout, 'isTTY', {value: true, writable: true})

      outputSuccess({message: 'done'}, 'Operation complete')
      expect(stdoutSpy).toHaveBeenCalledWith('\u2713 Operation complete\n')

      Object.defineProperty(process.stdout, 'isTTY', {value: original, writable: true})
    })
  })
})
