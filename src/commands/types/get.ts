import {Args, Flags} from '@oclif/core'
import {type ConversionSpec, isMultiSheetConversionSpec} from 'docutray'

import {BaseCommand} from '../../base-command.js'
import {createClient} from '../../client.js'
import {outputError, outputKeyValue, setForceJson} from '../../output.js'
import {resolveDocumentTypeId} from '../../resolve-type.js'

export default class TypesGet extends BaseCommand {
  static args = {
    code: Args.string({description: 'Document type code', required: true}),
  }

  static description = `Get the full details of a document type by its code. Returns the type name, description, field schema, and configuration. Use this to inspect a document type before converting documents or to verify type settings.`

  static examples = [
    {command: '<%= config.bin %> types get electronic-invoice', description: 'Get full details of a document type'},
    {command: '<%= config.bin %> types get electronic-invoice --json', description: 'Output full JSON (includes JSON Schema)'},
    {command: '<%= config.bin %> types get electronic-invoice | jq .jsonSchema', description: 'Extract just the JSON Schema (useful for scripts)'},
  ]

  static flags = {
    json: Flags.boolean({default: false, description: 'Output as JSON (default when piped)'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(TypesGet)
    setForceJson(flags.json)

    try {
      const client = createClient()
      const id = await resolveDocumentTypeId(client, args.code)
      const result = await client.documentTypes.get(id)

      outputKeyValue(result, [
        {key: 'Code', value: result.codeType},
        {key: 'Name', value: result.name},
        {key: 'Description', value: result.description || '(none)'},
        {key: 'Public', value: result.isPublic ? 'yes' : 'no'},
        {key: 'Draft', value: result.isDraft ? 'yes' : 'no'},
        {key: 'Schema', value: describeSchema(result.jsonSchema)},
        {key: 'Export spec', value: describeConversionSpec(result.conversionSpec)},
      ])
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}

function countOf(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`
}

// Falls back to '(present)' rather than throwing on a shape this CLI does not
// recognize: a cosmetic summary line must never cost the user the whole output.
function describeConversionSpec(spec: ConversionSpec | null | undefined): string {
  if (!spec) return '(none)'

  if (isMultiSheetConversionSpec(spec)) {
    if (!Array.isArray(spec.sheets)) return '(present)'
    const columns = spec.sheets.reduce(
      (total, sheet) => total + (Array.isArray(sheet?.columns) ? sheet.columns.length : 0),
      0,
    )
    return `${countOf(spec.sheets.length, 'sheet')}, ${countOf(columns, 'column')}`
  }

  if (!Array.isArray(spec.columns)) return '(present)'
  return countOf(spec.columns.length, 'column')
}

function describeSchema(jsonSchema: Record<string, unknown> | null | undefined): string {
  if (!jsonSchema) return '(none)'
  const properties = jsonSchema.properties
  if (properties && typeof properties === 'object') {
    const count = Object.keys(properties as Record<string, unknown>).length
    return `${count} top-level field${count === 1 ? '' : 's'}`
  }

  return '(present)'
}
