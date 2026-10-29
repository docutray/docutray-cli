import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {DSLValidationError} from 'docutray'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

vi.mock('../../../../src/client.js', () => ({
  createClient: vi.fn(),
}))

import {createClient} from '../../../../src/client.js'
import TypesRulesSet from '../../../../src/commands/types/rules/set.js'
import {rulesClient, TYPE_ID} from './helpers.js'

const mockCreateClient = vi.mocked(createClient)

describe('types rules set', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let stderrSpy: ReturnType<typeof vi.spyOn>
  let exitSpy: ReturnType<typeof vi.spyOn>
  let dir: string

  beforeEach(() => {
    vi.clearAllMocks()
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    exitSpy = vi.spyOn(TypesRulesSet.prototype, 'exit').mockImplementation(() => {
      throw new Error('EXIT')
    })
    dir = mkdtempSync(join(tmpdir(), 'docutray-rules-'))
  })

  afterEach(() => {
    exitSpy.mockRestore()
    rmSync(dir, {force: true, recursive: true})
  })

  it('saves rules read from a file', async () => {
    const client = rulesClient()
    mockCreateClient.mockReturnValue(client as never)
    const file = join(dir, 'rules.dsl')
    writeFileSync(file, 'field.total greaterThan 100\n')

    await TypesRulesSet.run(['invoice', file])

    expect(client.documentTypes.update).toHaveBeenCalledWith(TYPE_ID, {dslRules: 'field.total greaterThan 100\n'})
    expect(JSON.parse(stdoutSpy.mock.calls.map((c: any) => c[0]).join(''))).toEqual({
      codeType: 'invoice',
      dslRules: 'field.total greaterThan 100\n',
      id: TYPE_ID,
    })
  })

  it('saves inline rules', async () => {
    const client = rulesClient()
    mockCreateClient.mockReturnValue(client as never)

    await TypesRulesSet.run(['invoice', 'field.total greaterThan 5'])

    expect(client.documentTypes.update).toHaveBeenCalledWith(TYPE_ID, {dslRules: 'field.total greaterThan 5'})
  })

  it('clears the rules with --clear', async () => {
    const client = rulesClient()
    mockCreateClient.mockReturnValue(client as never)

    await TypesRulesSet.run(['invoice', '--clear'])

    expect(client.documentTypes.update).toHaveBeenCalledWith(TYPE_ID, {dslRules: null})
  })

  it('rejects RULES together with --clear', async () => {
    const client = rulesClient()
    mockCreateClient.mockReturnValue(client as never)

    await expect(TypesRulesSet.run(['invoice', 'field.total greaterThan 5', '--clear'])).rejects.toThrow('EXIT')

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Pass either RULES or --clear'))
    expect(client.documentTypes.update).not.toHaveBeenCalled()
  })

  it('requires RULES or --clear', async () => {
    mockCreateClient.mockReturnValue(rulesClient() as never)
    await expect(TypesRulesSet.run(['invoice'])).rejects.toThrow('EXIT')
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Missing RULES'))
  })

  it('rejects empty rules instead of clearing them silently', async () => {
    const client = rulesClient()
    mockCreateClient.mockReturnValue(client as never)
    const file = join(dir, 'empty.dsl')
    writeFileSync(file, '  \n')

    await expect(TypesRulesSet.run(['invoice', file])).rejects.toThrow('EXIT')

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('The rules are empty'))
    expect(client.documentTypes.update).not.toHaveBeenCalled()
  })

  it('reports compilation diagnostics and exits 1', async () => {
    const client = rulesClient()
    const diagnostics = [{column: 7, line: 2, message: 'se esperaba una expresión'}]
    client.documentTypes.update.mockRejectedValue(
      new DSLValidationError(400, {error: 'Invalid DSL rules', diagnostics}, 'Invalid DSL rules', new Headers(), diagnostics),
    )
    mockCreateClient.mockReturnValue(client as never)

    await expect(TypesRulesSet.run(['invoice', 'field.total greaterThan'])).rejects.toThrow('EXIT')

    const errorCall = stderrSpy.mock.calls.map((c: any) => c[0] as string).find((s: string) => s.startsWith('{'))
    const stderr = JSON.parse(errorCall!)
    expect(stderr).toMatchObject({diagnostics, error: 'Invalid DSL rules', status: 400})
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})
