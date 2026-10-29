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

  const page = await client.documentTypes.list({search: identifier, limit: 100})
  for await (const dt of page.autoPagingIter()) {
    if (dt.codeType === identifier) return dt.id
  }

  throw new Error(`Document type "${identifier}" not found`)
}

/**
 * Returns the codeType of every document type of the organization, walking all
 * pages of the list endpoint. The endpoint also returns the platform's public
 * types, which are left out: they are only considered when named explicitly.
 */
export async function listOrganizationDocumentTypeCodes(client: DocuTray): Promise<string[]> {
  const codes: string[] = []
  const page = await client.documentTypes.list({limit: 100})
  for await (const dt of page.autoPagingIter()) {
    if (dt.isPublic === false) codes.push(dt.codeType)
  }

  return codes
}
