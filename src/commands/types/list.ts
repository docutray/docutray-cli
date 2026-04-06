import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {createClient} from '../../client.js'
import {outputError, outputList, setForceJson} from '../../output.js'

export default class TypesList extends BaseCommand {
  static description = `List available document types with pagination and search. Document types define the extraction schema used when converting documents. Results are paginated \u2014 use --page and --limit to navigate through large result sets. Use --search to filter by name.`

  static examples = [
    {command: '<%= config.bin %> types list', description: 'List all document types (first page, default 20 results)'},
    {command: '<%= config.bin %> types list --search invoice', description: 'Search for document types by name'},
    {command: '<%= config.bin %> types list --limit 50 --page 2', description: 'Paginate through results'},
    {command: '<%= config.bin %> types list --json', description: 'Force JSON output'},
    {command: '<%= config.bin %> types list | jq ".data[].codeType"', description: 'Extract just the type codes (useful for scripting)'},
  ]

  static flags = {
    json: Flags.boolean({default: false, description: 'Output as JSON (default when piped)'}),
    limit: Flags.integer({default: 20, description: 'Number of results per page'}),
    page: Flags.integer({default: 1, description: 'Page number for pagination'}),
    search: Flags.string({description: 'Filter document types by name (case-insensitive substring match)'}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(TypesList)
    setForceJson(flags.json)

    try {
      const client = createClient()

      const result = await client.documentTypes.list({
        limit: flags.limit,
        page: flags.page,
        ...(flags.search && {search: flags.search}),
      })

      const rows = result.data.map((dt: {codeType: string; isDraft: boolean; isPublic: boolean; name: string}) => ({
        code: dt.codeType,
        draft: dt.isDraft ? 'yes' : 'no',
        name: dt.name,
        public: dt.isPublic ? 'yes' : 'no',
      }))

      const total = (result as unknown as Record<string, unknown>).total as number | undefined
      const count = total ?? result.data.length
      const totalPages = Math.max(1, Math.ceil(count / flags.limit))
      const footer = `Page ${flags.page} of ${totalPages} (${count} results)`

      outputList(result, rows, ['code', 'name', 'public', 'draft'], footer)
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}
