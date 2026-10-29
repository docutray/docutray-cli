import {vi} from 'vitest'

export const TYPE_ID = 'cmnp1nxdb004s01tm5gxakfdl'

export function rulesClient(overrides: {dslRules?: null | string; validate?: unknown} = {}) {
  const dslRules = 'dslRules' in overrides ? overrides.dslRules : 'field.total greaterThan 0'
  return {
    documentTypes: {
      get: vi.fn().mockResolvedValue({codeType: 'invoice', dslRules, id: TYPE_ID, name: 'Invoice'}),
      list: vi.fn().mockResolvedValue({data: [{codeType: 'invoice', id: TYPE_ID, name: 'Invoice'}]}),
      update: vi.fn().mockImplementation(async (_id: string, params: {dslRules: null | string}) => ({
        codeType: 'invoice',
        dslRules: params.dslRules,
        id: TYPE_ID,
        name: 'Invoice',
      })),
      validate: vi.fn().mockResolvedValue(
        overrides.validate ?? {errors: {count: 0, messages: []}, issues: [], valid: true, warnings: {count: 0, messages: []}},
      ),
    },
  }
}
