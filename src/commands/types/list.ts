import {Command, Flags} from '@oclif/core'

import {createClient} from '../../client.js'
import {outputError, outputJson, outputTable} from '../../output.js'

export default class TypesList extends Command {
  static description = 'List available document types'

  static examples = [
    '$ docutray types list',
    '$ docutray types list --search invoice',
    '$ docutray types list --table',
    '$ docutray types list --limit 50',
  ]

  static flags = {
    limit: Flags.integer({default: 20, description: 'Number of results per page'}),
    page: Flags.integer({default: 1, description: 'Page number'}),
    search: Flags.string({description: 'Search by name'}),
    table: Flags.boolean({default: false, description: 'Output as table'}),
  }

  async run(): Promise<void> {
    try {
      const {flags} = await this.parse(TypesList)
      const client = createClient()

      const result = await client.documentTypes.list({
        limit: flags.limit,
        page: flags.page,
        ...(flags.search && {search: flags.search}),
      })

      if (flags.table) {
        const rows = result.data.map((dt) => ({
          code: dt.codeType,
          draft: dt.isDraft ? 'yes' : 'no',
          name: dt.name,
          public: dt.isPublic ? 'yes' : 'no',
        }))
        outputTable(rows, ['code', 'name', 'public', 'draft'])
      } else {
        outputJson(result)
      }
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}
