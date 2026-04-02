import {Args, Command, Flags} from '@oclif/core'
import {writeFileSync} from 'node:fs'

import {createClient} from '../../client.js'
import {outputError, outputJson} from '../../output.js'

export default class TypesExport extends Command {
  static args = {
    code: Args.string({description: 'Document type code', required: true}),
  }

  static description = 'Export a document type to JSON'

  static examples = [
    '$ docutray types export electronic-invoice',
    '$ docutray types export electronic-invoice --output invoice-type.json',
  ]

  static flags = {
    output: Flags.string({char: 'o', description: 'Output file path'}),
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
