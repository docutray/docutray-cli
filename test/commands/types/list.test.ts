import {beforeEach, describe, expect, it, vi} from 'vitest'

vi.mock('../../../src/client.js', () => ({
  createClient: vi.fn(),
}))

import {createClient} from '../../../src/client.js'
import TypesList from '../../../src/commands/types/list.js'

const mockCreateClient = vi.mocked(createClient)

// Mimics the shape of the SDK's Page instance: `data` and `pagination` are
// the public fields, `pageOptions` is an internal field that carries the
// API client (and the apiKey). JSON.stringify will serialize `pageOptions`
// unless the CLI strips it.
function pageWithLeakedApiKey() {
  return {
    data: [
      {codeType: 'invoice', id: 'cmnp1nxdb004s01tm5gxakfdl', isDraft: false, isPublic: true, name: 'Invoice'},
    ],
    pageOptions: {
      client: {apiKey: 'dt_live_secret_should_never_be_printed', baseURL: 'https://app.docutray.com'},
      path: '/api/document-types',
      query: {limit: 20, page: 1},
    },
    pagination: {limit: 20, page: 1, total: 1},
  }
}

function mockClient(pageData = pageWithLeakedApiKey()) {
  const client = {
    documentTypes: {
      list: vi.fn().mockResolvedValue(pageData),
    },
  }
  mockCreateClient.mockReturnValue(client as never)
  return client
}

describe('types list', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
  })

  it('does not leak pageOptions or apiKey when --json is set', async () => {
    mockClient()

    await TypesList.run(['--json'])

    const stdoutOutput = stdoutSpy.mock.calls.map(([msg]) => String(msg)).join('')
    expect(stdoutOutput).not.toContain('pageOptions')
    expect(stdoutOutput).not.toContain('apiKey')
    expect(stdoutOutput).not.toContain('dt_live_secret_should_never_be_printed')
  })

  it('emits JSON with data and pagination when --json is set', async () => {
    mockClient()

    await TypesList.run(['--json'])

    const stdoutOutput = stdoutSpy.mock.calls.map(([msg]) => String(msg)).join('')
    const parsed = JSON.parse(stdoutOutput)
    expect(parsed.data).toHaveLength(1)
    expect(parsed.data[0].codeType).toBe('invoice')
    expect(parsed.pagination).toEqual({limit: 20, page: 1, total: 1})
    expect(parsed).not.toHaveProperty('pageOptions')
  })
})
