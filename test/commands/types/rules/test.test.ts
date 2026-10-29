import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

vi.mock('../../../../src/client.js', () => ({
  createClient: vi.fn(),
}))

import {createClient} from '../../../../src/client.js'
import TypesRulesTest from '../../../../src/commands/types/rules/test.js'
import {rulesClient, TYPE_ID} from './helpers.js'

const mockCreateClient = vi.mocked(createClient)

const invalidResult = {
  errors: {count: 1, messages: ['total debe ser mayor a 1000']},
  issues: [
    {code: 'VALIDATION_ERROR', field: 'total', message: 'total debe ser mayor a 1000', rule: 'min_total', severity: 'error', source: 'rule'},
  ],
  valid: false,
  warnings: {count: 0, messages: []},
}

describe('types rules test', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let stderrSpy: ReturnType<typeof vi.spyOn>
  let exitSpy: ReturnType<typeof vi.spyOn>
  let dir: string

  beforeEach(() => {
    vi.clearAllMocks()
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    exitSpy = vi.spyOn(TypesRulesTest.prototype, 'exit').mockImplementation(() => {
      throw new Error('EXIT')
    })
    dir = mkdtempSync(join(tmpdir(), 'docutray-rules-'))
  })

  afterEach(() => {
    exitSpy.mockRestore()
    rmSync(dir, {force: true, recursive: true})
  })

  function stdout(): string {
    return stdoutSpy.mock.calls.map((c: any) => c[0]).join('')
  }

  it('validates inline data against the stored rules and exits 0 when valid', async () => {
    const client = rulesClient()
    mockCreateClient.mockReturnValue(client as never)

    await TypesRulesTest.run(['invoice', '--data', '{"total":5}'])

    expect(client.documentTypes.validate).toHaveBeenCalledWith(TYPE_ID, {total: 5}, undefined)
    expect(JSON.parse(stdout()).valid).toBe(true)
    expect(exitSpy).not.toHaveBeenCalled()
  })

  it('tests temporary rules from a file without saving them', async () => {
    const client = rulesClient()
    mockCreateClient.mockReturnValue(client as never)
    const rules = join(dir, 'rules.dsl')
    const data = join(dir, 'data.json')
    writeFileSync(rules, 'field.total greaterThan 1000')
    writeFileSync(data, '{"total":5}')

    await TypesRulesTest.run(['invoice', '--data', data, '--rules', rules])

    expect(client.documentTypes.validate).toHaveBeenCalledWith(TYPE_ID, {total: 5}, {dslRules: 'field.total greaterThan 1000'})
    expect(client.documentTypes.update).not.toHaveBeenCalled()
  })

  it('outputs the result and exits 1 when the data is invalid', async () => {
    mockCreateClient.mockReturnValue(rulesClient({validate: invalidResult}) as never)

    await expect(TypesRulesTest.run(['invoice', '--data', '{"total":5}'])).rejects.toThrow('EXIT')

    expect(JSON.parse(stdout())).toEqual(invalidResult)
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('rejects invalid JSON data before calling the API', async () => {
    const client = rulesClient()
    mockCreateClient.mockReturnValue(client as never)

    await expect(TypesRulesTest.run(['invoice', '--data', '{not json'])).rejects.toThrow('EXIT')

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid --data'))
    expect(client.documentTypes.validate).not.toHaveBeenCalled()
  })

  it('rejects reading both --data and --rules from stdin', async () => {
    mockCreateClient.mockReturnValue(rulesClient() as never)
    await expect(TypesRulesTest.run(['invoice', '--data', '-', '--rules', '-'])).rejects.toThrow('EXIT')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Only one of --data and --rules'))
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

    it('shows each issue', async () => {
      mockCreateClient.mockReturnValue(rulesClient({validate: invalidResult}) as never)

      await expect(TypesRulesTest.run(['invoice', '--data', '{"total":5}'])).rejects.toThrow('EXIT')

      expect(stdout()).toContain('Validation:  ✗ invalid (1 error, 0 warnings)')
      expect(stdout()).toContain('✗ total: total debe ser mayor a 1000 [VALIDATION_ERROR, rule: min_total]')
    })

    it('falls back to the summaries when the API sends no issues', async () => {
      const legacy = {errors: {count: 1, messages: ['falta total']}, warnings: {count: 1, messages: ['fecha antigua']}}
      mockCreateClient.mockReturnValue(rulesClient({validate: legacy}) as never)

      await expect(TypesRulesTest.run(['invoice', '--data', '{}'])).rejects.toThrow('EXIT')

      expect(stdout()).toContain('Validation:  ✗ invalid (1 error, 1 warning)')
      expect(stdout()).toContain('  ✗ falta total\n')
      expect(stdout()).toContain('  ⚠ fecha antigua')
    })
  })
})
