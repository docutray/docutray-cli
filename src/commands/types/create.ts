import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {createClient} from '../../client.js'
import {outputError, outputKeyValue, outputSuccess, setForceJson} from '../../output.js'
import {parseSchema} from '../../parse-schema.js'

export default class TypesCreate extends BaseCommand {
  static description = `Create a new document type. Defines an extraction schema that DocuTray uses when converting documents. Requires a name, code, description, and JSON schema. The schema can be provided as a file path or inline JSON string.`

  static examples = [
    {command: '<%= config.bin %> types create --name "Invoice" --code invoice --description "Standard invoice" --schema schema.json', description: 'Create from a schema file'},
    {command: '<%= config.bin %> types create --name "Invoice" --code invoice --description "Standard invoice" --schema \'{"type":"object","properties":{"total":{"type":"number"}}}\'', description: 'Create with inline JSON schema'},
    {command: '<%= config.bin %> types create --name "Invoice" --code invoice --description "Standard invoice" --schema schema.json --publish', description: 'Create and publish immediately'},
    {command: '<%= config.bin %> types create --name "Invoice" --code invoice --description "Standard invoice" --schema schema.json --conversion-mode toon', description: 'Create with a specific conversion mode'},
  ]

  static flags = {
    code: Flags.string({description: 'Unique code identifier (lowercase, numbers, underscores)', required: true}),
    'conversion-mode': Flags.string({description: 'Conversion mode', options: ['json', 'toon', 'multi_prompt']}),
    description: Flags.string({description: 'Description of the document type', required: true}),
    draft: Flags.boolean({allowNo: true, default: true, description: 'Create as draft (default: true)'}),
    'identify-hints': Flags.string({description: 'Hints for automatic document identification'}),
    json: Flags.boolean({default: false, description: 'Output as JSON (default when piped)'}),
    'keep-ordering': Flags.boolean({default: false, description: 'Preserve property ordering in extraction output'}),
    name: Flags.string({description: 'Document type name', required: true}),
    'prompt-hints': Flags.string({description: 'General extraction prompt hints'}),
    publish: Flags.boolean({default: false, description: 'Publish immediately (equivalent to --no-draft)', exclusive: ['draft']}),
    schema: Flags.string({description: 'JSON schema: file path or inline JSON string', required: true}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(TypesCreate)
    setForceJson(flags.json)

    try {
      const jsonSchema = parseSchema(flags.schema)

      const client = createClient()
      const result = await client.documentTypes.create({
        codeType: flags.code,
        conversionMode: flags['conversion-mode'] as 'json' | 'toon' | 'multi_prompt' | undefined,
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
        {key: 'Mode', value: (() => { const mode = (result as unknown as Record<string, unknown>).conversionMode; return typeof mode === 'string' && mode.trim() !== '' ? mode : 'json'; })()},
      ])

      outputSuccess({codeType: result.codeType, id: result.id}, `Created document type "${result.codeType}"`)
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}
