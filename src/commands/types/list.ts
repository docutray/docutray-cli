import {Command, Flags} from '@oclif/core'

import {createClient} from '../../client.js'
import {outputError, outputJson, outputTable} from '../../output.js'

export default class TypesList extends Command {
  static description = `List available document types with pagination and search. Document types define the extraction schema used when converting documents. Results are paginated — use --page and --limit to navigate through large result sets. Use --search to filter by name.`

  static examples = [
    {command: '<%= config.bin %> types list', description: 'List all document types (first page, default 20 results)'},
    {command: '<%= config.bin %> types list --search invoice', description: 'Search for document types by name'},
    {command: '<%= config.bin %> types list --table', description: 'Display results as a formatted table'},
    {command: '<%= config.bin %> types list --limit 50 --page 2', description: 'Paginate through results'},
    {command: '<%= config.bin %> types list | jq ".data[].codeType"', description: 'Extract just the type codes (useful for scripting)'},
  ]

  static flags = {
    limit: Flags.integer({default: 20, description: 'Number of results per page'}),
    page: Flags.integer({default: 1, description: 'Page number for pagination'}),
    search: Flags.string({description: 'Filter document types by name (case-insensitive substring match)'}),
    table: Flags.boolean({default: false, description: 'Output results as a formatted table instead of JSON'}),
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
