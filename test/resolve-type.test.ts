import {describe, expect, it, vi} from 'vitest'

import {resolveDocumentTypeId} from '../src/resolve-type.js'

function mockClient(data: Array<{codeType: string; id: string}> = []) {
  return {
    documentTypes: {
      list: vi.fn().mockResolvedValue({data}),
    },
  } as any
}

describe('resolveDocumentTypeId', () => {
  it('passes through an internal id directly', async () => {
    const client = mockClient()

    const id = await resolveDocumentTypeId(client, 'cmnp1nxdb004s01tm5gxakfdl')

    expect(id).toBe('cmnp1nxdb004s01tm5gxakfdl')
    expect(client.documentTypes.list).not.toHaveBeenCalled()
  })

  it('resolves codeType to id via list search', async () => {
    const client = mockClient([
      {codeType: 'invoice', id: 'cmnp1nxdb004s01tm5gxakfdl'},
    ])

    const id = await resolveDocumentTypeId(client, 'invoice')

    expect(id).toBe('cmnp1nxdb004s01tm5gxakfdl')
    expect(client.documentTypes.list).toHaveBeenCalledWith({search: 'invoice', page: 1, limit: 100})
  })

  it('uses exact match when multiple results exist', async () => {
    const client = mockClient([
      {codeType: 'invoice-v2', id: 'other-id-0000000000000000'},
      {codeType: 'invoice', id: 'cmnp1nxdb004s01tm5gxakfdl'},
    ])

    const id = await resolveDocumentTypeId(client, 'invoice')

    expect(id).toBe('cmnp1nxdb004s01tm5gxakfdl')
  })

  it('throws when codeType is not found', async () => {
    const client = mockClient([])

    await expect(resolveDocumentTypeId(client, 'nonexistent')).rejects.toThrow(
      'Document type "nonexistent" not found',
    )
  })

  it('paginates to find match on a later page', async () => {
    const firstPage = Array.from({length: 100}, (_, i) => ({
      codeType: `type-${i}`,
      id: `id-${i}-000000000000000000000`,
    }))
    const secondPage = [{codeType: 'invoice', id: 'cmnp1nxdb004s01tm5gxakfdl'}]

    const client = {
      documentTypes: {
        list: vi.fn()
          .mockResolvedValueOnce({data: firstPage})
          .mockResolvedValueOnce({data: secondPage}),
      },
    } as any

    const id = await resolveDocumentTypeId(client, 'invoice')

    expect(id).toBe('cmnp1nxdb004s01tm5gxakfdl')
    expect(client.documentTypes.list).toHaveBeenCalledTimes(2)
    expect(client.documentTypes.list).toHaveBeenCalledWith({search: 'invoice', page: 2, limit: 100})
  })

  it('throws when no exact match exists among results', async () => {
    const client = mockClient([
      {codeType: 'invoice-v2', id: 'some-id-00000000000000000'},
    ])

    await expect(resolveDocumentTypeId(client, 'invoice')).rejects.toThrow(
      'Document type "invoice" not found',
    )
  })
})
