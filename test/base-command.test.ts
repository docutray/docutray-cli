import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import Convert from '../src/commands/convert.js'
import TypesGet from '../src/commands/types/get.js'

describe('BaseCommand error UX', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>
  let stdoutSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('missing required arg in TTY mode', () => {
    it('shows error message and command help', async () => {
      const originalTTY = process.stderr.isTTY
      Object.defineProperty(process.stderr, 'isTTY', {value: true, writable: true})

      const exitSpy = vi.spyOn(Convert.prototype, 'exit').mockImplementation(() => {
        throw new Error('EXIT')
      })

      await expect(Convert.run([])).rejects.toThrow('EXIT')

      const output = stderrSpy.mock.calls.map((c) => c[0]).join('')
      expect(output).toContain('\u2717 Error:')
      expect(output).toContain('Missing')
      // Help output should include the command usage
      const fullOutput = [...stderrSpy.mock.calls, ...stdoutSpy.mock.calls].map((c) => c[0]).join('')
      expect(fullOutput).toContain('convert')

      Object.defineProperty(process.stderr, 'isTTY', {value: originalTTY, writable: true})
      exitSpy.mockRestore()
    })
  })

  describe('missing required arg in pipe mode', () => {
    it('outputs JSON error to stderr', async () => {
      const originalTTY = process.stderr.isTTY
      Object.defineProperty(process.stderr, 'isTTY', {value: false, writable: true})

      const exitSpy = vi.spyOn(TypesGet.prototype, 'exit').mockImplementation(() => {
        throw new Error('EXIT')
      })

      await expect(TypesGet.run([])).rejects.toThrow('EXIT')

      const output = stderrSpy.mock.calls.map((c) => c[0]).join('')
      expect(output).toContain('"error"')
      expect(output).toContain('Missing')

      Object.defineProperty(process.stderr, 'isTTY', {value: originalTTY, writable: true})
      exitSpy.mockRestore()
    })
  })

  describe('missing required flag in TTY mode', () => {
    it('shows error and help for missing --type flag', async () => {
      const originalTTY = process.stderr.isTTY
      Object.defineProperty(process.stderr, 'isTTY', {value: true, writable: true})

      const exitSpy = vi.spyOn(Convert.prototype, 'exit').mockImplementation(() => {
        throw new Error('EXIT')
      })

      // Provide the arg but not the required --type flag
      await expect(Convert.run(['invoice.pdf'])).rejects.toThrow('EXIT')

      const output = stderrSpy.mock.calls.map((c) => c[0]).join('')
      expect(output).toContain('\u2717 Error:')
      expect(output).toContain('Missing required flag')

      Object.defineProperty(process.stderr, 'isTTY', {value: originalTTY, writable: true})
      exitSpy.mockRestore()
    })
  })
})
