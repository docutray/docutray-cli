import {Args, Command, Flags} from '@oclif/core'

import {createClient} from '../../client.js'
import {outputError, outputJson, outputTable} from '../../output.js'

export default class TypesGet extends Command {
  static args = {
    code: Args.string({description: 'Document type code', required: true}),
  }

  static description = 'Get details of a document type'

  static examples = [
    '$ docutray types get electronic-invoice',
    '$ docutray types get electronic-invoice --table',
  ]

  static flags = {
    table: Flags.boolean({default: false, description: 'Output as table'}),
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
