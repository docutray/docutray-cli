import {Args, Command, Flags} from '@oclif/core'
import type {IdentifyParams} from 'docutray'
import {readFileSync} from 'node:fs'
import {basename} from 'node:path'

import {createClient} from '../client.js'
import {outputError, outputJson, outputTable} from '../output.js'

export default class Identify extends Command {
  static args = {
    source: Args.string({description: 'File path or URL to identify', required: true}),
  }

  static description = 'Identify the type of a document'

  static examples = [
    '$ docutray identify document.pdf',
    '$ docutray identify https://example.com/doc.pdf',
    '$ docutray identify document.pdf --table',
  ]

  static flags = {
    async: Flags.boolean({default: false, description: 'Use async processing with polling'}),
    table: Flags.boolean({default: false, description: 'Output as table'}),
    types: Flags.string({description: 'Comma-separated list of document type codes to filter'}),
  }

  async run(): Promise<void> {
    try {
      const {args, flags} = await this.parse(Identify)
      const client = createClient()
      const isUrl = args.source.startsWith('http://') || args.source.startsWith('https://')

      const params: IdentifyParams = {
        ...(flags.types && {documentTypeCodeOptions: flags.types.split(',').map((t) => t.trim())}),
        ...(isUrl
          ? {url: args.source}
          : {file: readFileSync(args.source), filename: basename(args.source)}),
      }

      let result
      if (flags.async) {
        const status = await client.identify.runAsync(params)
        result = await status.wait({
          onStatus(s) {
            process.stderr.write(JSON.stringify({status: s.status}) + '\n')
          },
        })
      } else {
        result = await client.identify.run(params)
      }

      if (flags.table && result.document_type) {
        const rows = [
          {code: result.document_type.code, confidence: result.document_type.confidence, name: result.document_type.name},
          ...(result.alternatives || []).map((alt) => ({
            code: alt.code,
            confidence: alt.confidence,
            name: alt.name,
          })),
        ]
        outputTable(rows, ['code', 'name', 'confidence'])
      } else {
        outputJson(result)
      }
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}
