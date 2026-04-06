import {Args, Command, Flags} from '@oclif/core'

import {createClient} from '../../client.js'
import {outputError, outputKeyValue, setForceJson} from '../../output.js'

export default class TypesGet extends Command {
  static args = {
    code: Args.string({description: 'Document type code', required: true}),
  }

  static description = `Get the full details of a document type by its code. Returns the type name, description, field schema, and configuration. Use this to inspect a document type before converting documents or to verify type settings.`

  static examples = [
    {command: '<%= config.bin %> types get electronic-invoice', description: 'Get full details of a document type'},
    {command: '<%= config.bin %> types get electronic-invoice --json', description: 'Output full JSON (includes field schema)'},
    {command: '<%= config.bin %> types get electronic-invoice | jq .fields', description: 'Extract just the field schema (useful for scripts)'},
  ]

  static flags = {
    json: Flags.boolean({default: false, description: 'Output as JSON (default when piped)'}),
  }

  async run(): Promise<void> {
    try {
      const {args, flags} = await this.parse(TypesGet)
      if (flags.json) setForceJson(true)

      const client = createClient()
      const result = await client.documentTypes.get(args.code)

      outputKeyValue(result, [
        {key: 'Code', value: result.codeType},
        {key: 'Name', value: result.name},
        {key: 'Description', value: result.description || '(none)'},
        {key: 'Public', value: result.isPublic ? 'yes' : 'no'},
        {key: 'Draft', value: result.isDraft ? 'yes' : 'no'},
        {key: 'Fields', value: (result as unknown as Record<string, unknown>).fields ? `${((result as unknown as Record<string, unknown>).fields as unknown[]).length} fields` : '0 fields'},
      ])
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}
