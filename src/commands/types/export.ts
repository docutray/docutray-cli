import {Args, Flags} from '@oclif/core'
import {existsSync, statSync, writeFileSync} from 'node:fs'

import {BaseCommand} from '../../base-command.js'
import {createClient} from '../../client.js'
import {outputError, outputJson, outputSuccess, setForceJson} from '../../output.js'
import {resolveDocumentTypeId} from '../../resolve-type.js'

export default class TypesExport extends BaseCommand {
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
    force: Flags.boolean({default: false, description: 'Overwrite existing file'}),
    json: Flags.boolean({default: false, description: 'Output as JSON (default when piped)'}),
    output: Flags.string({char: 'o', description: 'Output file path. If omitted, writes to stdout.'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(TypesExport)
    setForceJson(flags.json)

    try {
      const client = createClient()
      const id = await resolveDocumentTypeId(client, args.code)
      const result = await client.documentTypes.get(id)

      if (flags.output) {
        if (existsSync(flags.output) && statSync(flags.output).isDirectory()) {
          throw new Error(`Output path is a directory: ${flags.output}`)
        }

        if (!flags.force && existsSync(flags.output)) {
          throw new Error(`File already exists: ${flags.output}. Use --force to overwrite.`)
        }

        writeFileSync(flags.output, JSON.stringify(result, null, 2) + '\n')
        const data = {exported: flags.output, code: result.codeType}
        outputSuccess(data, `Exported ${result.codeType} to ${flags.output}`)
      } else {
        outputJson(result)
      }
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}
