import {Args, Command, Flags} from '@oclif/core'

import {createClient} from '../../client.js'
import {outputError, outputJson, outputTable} from '../../output.js'

export default class TypesGet extends Command {
  static args = {
    code: Args.string({description: 'Document type code', required: true}),
  }

  static description = `Get the full details of a document type by its code. Returns the type name, description, field schema, and configuration. Use this to inspect a document type before converting documents or to verify type settings.`

  static examples = [
    {command: '<%= config.bin %> types get electronic-invoice', description: 'Get full details of a document type'},
    {command: '<%= config.bin %> types get electronic-invoice --table', description: 'Display details as a formatted table'},
    {command: '<%= config.bin %> types get electronic-invoice | jq .fields', description: 'Extract just the field schema (useful for scripts)'},
  ]

  static flags = {
    table: Flags.boolean({default: false, description: 'Output details as a formatted table instead of JSON'}),
  }

  async run(): Promise<void> {
    try {
      const {args, flags} = await this.parse(TypesGet)
      const client = createClient()

      const result = await client.documentTypes.get(args.code)

      if (flags.table) {
        outputTable(
          [{
            code: result.codeType,
            description: result.description || '',
            draft: result.isDraft ? 'yes' : 'no',
            name: result.name,
            public: result.isPublic ? 'yes' : 'no',
          }],
          ['code', 'name', 'description', 'public', 'draft'],
        )
      } else {
        outputJson(result)
      }
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}
