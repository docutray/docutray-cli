import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import Convert from '../src/commands/convert.js'
import {setForceJson} from '../src/output.js'
import TypesGet from '../src/commands/types/get.js'

describe('BaseCommand error UX', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let originalStderrTTY: boolean | undefined

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    originalStderrTTY = process.stderr.isTTY
    setForceJson(false)
  })

  afterEach(() => {
    Object.defineProperty(process.stderr, 'isTTY', {value: originalStderrTTY, writable: true})
    vi.restoreAllMocks()
  })

  describe('missing required arg in TTY mode', () => {
    it('shows error message and command help on stderr', async () => {
      Object.defineProperty(process.stderr, 'isTTY', {value: true, writable: true})

      const exitSpy = vi.spyOn(Convert.prototype, 'exit').mockImplementation(() => {
        throw new Error('EXIT')
      })

      await expect(Convert.run([])).rejects.toThrow('EXIT')

      const stderrOutput = stderrSpy.mock.calls.map((c) => c[0]).join('')
      expect(stderrOutput).toContain('\u2717 Error:')
      expect(stderrOutput).toContain('Missing')
      // Help output goes to stderr (not stdout)
      expect(stderrOutput).toContain('convert')

      exitSpy.mockRestore()
    })
  })

  describe('missing required arg in pipe mode', () => {
    it('outputs JSON error to stderr', async () => {
      Object.defineProperty(process.stderr, 'isTTY', {value: false, writable: true})

      const exitSpy = vi.spyOn(TypesGet.prototype, 'exit').mockImplementation(() => {
        throw new Error('EXIT')
      })

      await expect(TypesGet.run([])).rejects.toThrow('EXIT')

      const output = stderrSpy.mock.calls.map((c) => c[0]).join('')
      expect(output).toContain('"error"')
      expect(output).toContain('Missing')

      exitSpy.mockRestore()
    })
  })

  describe('missing required flag in TTY mode', () => {
    it('shows error for missing --type flag', async () => {
      Object.defineProperty(process.stderr, 'isTTY', {value: true, writable: true})

      const exitSpy = vi.spyOn(Convert.prototype, 'exit').mockImplementation(() => {
        throw new Error('EXIT')
      })

      // Provide the arg but not the required --type flag
      await expect(Convert.run(['invoice.pdf'])).rejects.toThrow('EXIT')

      const stderrOutput = stderrSpy.mock.calls.map((c) => c[0]).join('')
      expect(stderrOutput).toContain('\u2717 Error:')
      expect(stderrOutput).toContain('required flag')

      exitSpy.mockRestore()
    })
  })
})
