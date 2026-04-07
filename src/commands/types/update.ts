import {Args, Flags} from '@oclif/core'
import type {DocumentTypeUpdateParams} from 'docutray'

import {BaseCommand} from '../../base-command.js'
import {createClient} from '../../client.js'
import {outputError, outputKeyValue, outputSuccess, setForceJson} from '../../output.js'
import {parseSchema} from '../../parse-schema.js'
import {resolveDocumentTypeId} from '../../resolve-type.js'

export default class TypesUpdate extends BaseCommand {
  static args = {
    code: Args.string({description: 'Document type code to update', required: true}),
  }

  static description = `Update an existing document type. Allows modifying name, description, schema, prompt hints, and other settings. At least one field to update must be provided. The code identifier cannot be changed.`

  static examples = [
    {command: '<%= config.bin %> types update invoice --name "Updated Invoice"', description: 'Update the name'},
    {command: '<%= config.bin %> types update invoice --schema new-schema.json', description: 'Update the schema from a file'},
    {command: '<%= config.bin %> types update invoice --prompt-hints "Use dd/mm/yyyy for dates"', description: 'Update prompt hints'},
    {command: '<%= config.bin %> types update invoice --publish', description: 'Publish a draft type'},
  ]

  static flags = {
    'conversion-mode': Flags.string({description: 'Conversion mode', options: ['json', 'toon', 'multi_prompt']}),
    description: Flags.string({description: 'New description'}),
    draft: Flags.boolean({allowNo: true, description: 'Set draft status'}),
    'identify-hints': Flags.string({description: 'Hints for automatic document identification'}),
    json: Flags.boolean({default: false, description: 'Output as JSON (default when piped)'}),
    'keep-ordering': Flags.boolean({allowNo: true, description: 'Preserve property ordering in extraction output'}),
    name: Flags.string({description: 'New name'}),
    'prompt-hints': Flags.string({description: 'General extraction prompt hints'}),
    publish: Flags.boolean({default: false, description: 'Publish immediately (sets draft to false)', exclusive: ['draft']}),
    schema: Flags.string({description: 'New JSON schema: file path or inline JSON string'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(TypesUpdate)
    setForceJson(flags.json)

    try {
      const params: DocumentTypeUpdateParams = {}

      if (flags.name !== undefined) params.name = flags.name
      if (flags.description !== undefined) params.description = flags.description
      if (flags.schema !== undefined) params.jsonSchema = parseSchema(flags.schema)
      if (flags['prompt-hints'] !== undefined) params.promptHints = flags['prompt-hints']
      if (flags['identify-hints'] !== undefined) params.identifyPromptHints = flags['identify-hints']
      if (flags['conversion-mode'] !== undefined) params.conversionMode = flags['conversion-mode'] as 'json' | 'toon' | 'multi_prompt'
      if (flags['keep-ordering'] !== undefined) params.keepPropertyOrdering = flags['keep-ordering']
      if (flags.publish) params.isDraft = false
      else if (flags.draft !== undefined) params.isDraft = flags.draft

      if (Object.keys(params).length === 0) {
        throw new Error('At least one field to update must be provided')
      }

      const client = createClient()
      const id = await resolveDocumentTypeId(client, args.code)
      const result = await client.documentTypes.update(id, params)

      outputKeyValue(result, [
        {key: 'Code', value: result.codeType},
        {key: 'Name', value: result.name},
        {key: 'Description', value: result.description || '(none)'},
        {key: 'Draft', value: result.isDraft ? 'yes' : 'no'},
      ])

      outputSuccess({codeType: result.codeType, id: result.id}, `Updated document type "${result.codeType}"`)
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}
