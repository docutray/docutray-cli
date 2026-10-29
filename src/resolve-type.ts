import type DocuTray from 'docutray'

/**
 * Resolves a document type identifier (codeType or internal id) to an internal id.
 * If the input looks like an internal id (c + 24 lowercase alphanumeric chars), returns it directly.
 * Otherwise, searches by codeType and returns the matching id.
 */
export async function resolveDocumentTypeId(client: DocuTray, identifier: string): Promise<string> {
  if (/^c[a-z0-9]{24}$/.test(identifier)) {
    return identifier
  }

  const limit = 100
  let page = 1

  while (true) {
    const result = await client.documentTypes.list({search: identifier, page, limit})
    const match = result.data.find(
      (dt: {codeType: string; id: string}) => dt.codeType === identifier,
    )

    if (match) {
      return match.id
    }

    if (result.data.length < limit) {
      break
    }

    page += 1
  }

  throw new Error(`Document type "${identifier}" not found`)
}

/**
 * Returns the codeType of every document type of the organization, walking all
 * pages of the list endpoint. The endpoint also returns the platform's public
 * types, which are left out: they are only considered when named explicitly.
 */
export async function listOrganizationDocumentTypeCodes(client: DocuTray): Promise<string[]> {
  const limit = 100
  const codes: string[] = []
  let page = 1

  while (true) {
    const result = await client.documentTypes.list({page, limit})
    codes.push(...result.data.filter((dt) => dt.isPublic === false).map((dt) => dt.codeType))

    if (result.data.length < limit) {
      break
    }

    page += 1
  }

  return codes
}
