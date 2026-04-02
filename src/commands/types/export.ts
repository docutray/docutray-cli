import {Args, Command, Flags} from '@oclif/core'
import {writeFileSync} from 'node:fs'

import {createClient} from '../../client.js'
import {outputError, outputJson} from '../../output.js'

export default class TypesExport extends Command {
  static args = {
    code: Args.string({description: 'Document type code', required: true}),
  }

  static description = `Export a document type definition to JSON format. By default, writes to stdout for piping or redirection. Use --output to write directly to a file. Useful for backing up type definitions, version-controlling them in Git, or migrating types between environments.`

  static examples = [
    {command: '<%= config.bin %> types export electronic-invoice', description: 'Export a document type to stdout'},
    {command: '<%= config.bin %> types export electronic-invoice -o invoice-type.json', description: 'Export directly to a file'},
    {command: '<%= config.bin %> types export electronic-invoice > backup.json', description: 'Export using shell redirection'},
    {command: '<%= config.bin %> types export electronic-invoice | jq .', description: 'Export and pretty-print with jq'},
  ]

  static flags = {
    output: Flags.string({char: 'o', description: 'Output file path. If omitted, writes to stdout.'}),
  }

  async run(): Promise<void> {
    try {
      const {args, flags} = await this.parse(TypesExport)
      const client = createClient()

      const result = await client.documentTypes.get(args.code)

      if (flags.output) {
        writeFileSync(flags.output, JSON.stringify(result, null, 2) + '\n')
        outputJson({exported: flags.output, code: result.codeType})
      } else {
        outputJson(result)
      }
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}
