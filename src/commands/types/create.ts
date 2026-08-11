import {Flags} from '@oclif/core'
import type {ConversionMode} from 'docutray'

import {BaseCommand} from '../../base-command.js'
import {createClient} from '../../client.js'
import {outputError, outputKeyValue, outputSuccess, setForceJson} from '../../output.js'
import {parseConversionSpec, parseSchemaPayload} from '../../parse-schema.js'

export default class TypesCreate extends BaseCommand {
  static description = `Create a new document type. Defines an extraction schema that DocuTray uses when converting documents. Requires a name, code, description, and JSON schema. The schema can be provided as a file path or inline JSON string. Files exported via "types export" are also accepted: the inner jsonSchema is extracted automatically.`

  static examples = [
    {command: '<%= config.bin %> types create --name "Invoice" --code invoice --description "Standard invoice" --schema schema.json', description: 'Create from a schema file'},
    {command: '<%= config.bin %> types create --name "Invoice" --code invoice --description "Standard invoice" --schema \'{"type":"object","properties":{"total":{"type":"number"}}}\'', description: 'Create with inline JSON schema'},
    {command: '<%= config.bin %> types export factura -o factura.json && <%= config.bin %> types create --name "Factura Copy" --code factura_copy --description "Copy of factura" --schema factura.json', description: 'Round-trip: export an existing type and re-create it (schema and export spec are carried over)'},
    {command: '<%= config.bin %> types create --name "Invoice" --code invoice --description "Standard invoice" --schema schema.json --publish', description: 'Create and publish immediately'},
    {command: '<%= config.bin %> types create --name "Invoice" --code invoice --description "Standard invoice" --schema schema.json --conversion-mode toon', description: 'Create with a specific conversion mode'},
    {command: '<%= config.bin %> types create --name "Invoice" --code invoice --description "Standard invoice" --schema schema.json --conversion-spec spec.json', description: 'Create with an export spec (JSON → CSV/Excel column mapping)'},
  ]

  static flags = {
    code: Flags.string({description: 'Unique code identifier (lowercase, numbers, underscores)', required: true}),
    'conversion-mode': Flags.string({description: 'Conversion mode', options: ['json', 'toon', 'multi_prompt']}),
    'conversion-spec': Flags.string({description: 'Export spec (JSON → CSV/Excel column mapping): file path or inline JSON. Accepts a bare spec ({"columns":[...]} or {"sheets":[...]}) or a full "types export" payload. Takes precedence over a spec embedded in --schema.'}),
    description: Flags.string({description: 'Description of the document type', required: true}),
    draft: Flags.boolean({allowNo: true, default: true, description: 'Create as draft (default: true)'}),
    'identify-hints': Flags.string({description: 'Hints for automatic document identification'}),
    json: Flags.boolean({default: false, description: 'Output as JSON (default when piped)'}),
    'keep-ordering': Flags.boolean({default: false, description: 'Preserve property ordering in extraction output'}),
    name: Flags.string({description: 'Document type name', required: true}),
    'prompt-hints': Flags.string({description: 'General extraction prompt hints'}),
    publish: Flags.boolean({default: false, description: 'Publish immediately (equivalent to --no-draft)', exclusive: ['draft']}),
    schema: Flags.string({description: 'JSON schema: file path or inline JSON string. When given a full "types export" payload, its conversionSpec is carried over too.', required: true}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(TypesCreate)
    setForceJson(flags.json)

    try {
      const {conversionSpec: embeddedSpec, jsonSchema} = parseSchemaPayload(flags.schema)
      const conversionSpec = flags['conversion-spec']
        ? parseConversionSpec(flags['conversion-spec'])
        : embeddedSpec

      const client = createClient()
      const result = await client.documentTypes.create({
        codeType: flags.code,
        conversionMode: flags['conversion-mode'] as ConversionMode | undefined,
        ...(conversionSpec && {conversionSpec}),
        description: flags.description,
        identifyPromptHints: flags['identify-hints'],
        isDraft: flags.publish ? false : flags.draft,
        jsonSchema,
        keepPropertyOrdering: flags['keep-ordering'] || undefined,
        name: flags.name,
        promptHints: flags['prompt-hints'],
      })

      outputKeyValue(result, [
        {key: 'Code', value: result.codeType},
        {key: 'Name', value: result.name},
        {key: 'Description', value: result.description || '(none)'},
        {key: 'Draft', value: result.isDraft ? 'yes' : 'no'},
        {key: 'Mode', value: result.conversionMode || 'json'},
      ])

      outputSuccess({codeType: result.codeType, id: result.id}, `Created document type "${result.codeType}"`)
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}
