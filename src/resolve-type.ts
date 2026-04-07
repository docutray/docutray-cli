import type DocuTray from 'docutray'

/**
 * Resolves a document type identifier (codeType or internal id) to an internal id.
 * If the input looks like an internal id (c + 24 alphanumeric chars), returns it directly.
 * Otherwise, searches by codeType and returns the matching id.
 */
export async function resolveDocumentTypeId(client: DocuTray, identifier: string): Promise<string> {
  if (/^c[a-z0-9]{24}$/.test(identifier)) {
    return identifier
  }

  const result = await client.documentTypes.list({search: identifier})
  const match = result.data.find(
    (dt: {codeType: string; id: string}) => dt.codeType === identifier,
  )

  if (!match) {
    throw new Error(`Document type "${identifier}" not found`)
  }

  return match.id
}
