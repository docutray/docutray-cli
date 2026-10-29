import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

vi.mock('../../../../src/client.js', () => ({
  createClient: vi.fn(),
}))

import {createClient} from '../../../../src/client.js'
import TypesRulesGet from '../../../../src/commands/types/rules/get.js'
import {rulesClient, TYPE_ID} from './helpers.js'

const mockCreateClient = vi.mocked(createClient)

describe('types rules get', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let stderrSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
  })

  function stdout(): string {
    return stdoutSpy.mock.calls.map((c: any) => c[0]).join('')
  }

  it('resolves the code and outputs codeType and dslRules as JSON', async () => {
    const client = rulesClient()
    mockCreateClient.mockReturnValue(client as never)

    await TypesRulesGet.run(['invoice'])

    expect(client.documentTypes.get).toHaveBeenCalledWith(TYPE_ID)
    expect(JSON.parse(stdout())).toEqual({codeType: 'invoice', dslRules: 'field.total greaterThan 0'})
  })

  it('outputs null when the type has no rules', async () => {
    mockCreateClient.mockReturnValue(rulesClient({dslRules: undefined}) as never)
    await TypesRulesGet.run(['invoice'])
    expect(JSON.parse(stdout())).toEqual({codeType: 'invoice', dslRules: null})
  })

  it('prints only the rules text with --raw', async () => {
    mockCreateClient.mockReturnValue(rulesClient() as never)
    await TypesRulesGet.run(['invoice', '--raw'])
    expect(stdout()).toBe('field.total greaterThan 0\n')
  })

  it('prints nothing with --raw when the type has no rules', async () => {
    mockCreateClient.mockReturnValue(rulesClient({dslRules: null}) as never)
    await TypesRulesGet.run(['invoice', '--raw'])
    expect(stdout()).toBe('')
  })

  it('outputs error when the document type does not exist', async () => {
    const client = rulesClient()
    client.documentTypes.list.mockResolvedValue({data: []})
    mockCreateClient.mockReturnValue(client as never)
    const exitSpy = vi.spyOn(TypesRulesGet.prototype, 'exit').mockImplementation(() => {
      throw new Error('EXIT')
    })

    await expect(TypesRulesGet.run(['missing'])).rejects.toThrow('EXIT')

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('not found'))
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

    it('prints the rules text', async () => {
      mockCreateClient.mockReturnValue(rulesClient() as never)
      await TypesRulesGet.run(['invoice'])
      expect(stdout()).toBe('field.total greaterThan 0\n')
    })

    it('says so when the type has no rules', async () => {
      mockCreateClient.mockReturnValue(rulesClient({dslRules: null}) as never)
      await TypesRulesGet.run(['invoice'])
      expect(stdout()).toBe('No DSL rules defined for "invoice".\n')
    })
  })
})
