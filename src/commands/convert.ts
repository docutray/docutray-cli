import {Args, Command, Flags} from '@oclif/core'
import type {ConvertParams} from 'docutray'
import {readFileSync} from 'node:fs'
import {basename} from 'node:path'

import {createClient} from '../client.js'
import {outputError, outputJson} from '../output.js'

export default class Convert extends Command {
  static args = {
    source: Args.string({description: 'File path or URL to convert', required: true}),
  }

  static description = 'Convert a document to structured data'

  static examples = [
    '$ docutray convert invoice.pdf --type electronic-invoice',
    '$ docutray convert https://example.com/doc.pdf --type electronic-invoice',
    '$ docutray convert invoice.pdf --type electronic-invoice --async',
  ]

  static flags = {
    async: Flags.boolean({default: false, description: 'Use async processing with polling'}),
    metadata: Flags.string({description: 'JSON metadata to attach to the conversion'}),
    type: Flags.string({char: 't', description: 'Document type code', required: true}),
    'webhook-url': Flags.string({description: 'Webhook URL for completion notification'}),
  }

  async run(): Promise<void> {
    try {
      const {args, flags} = await this.parse(Convert)
      const client = createClient()
      const isUrl = args.source.startsWith('http://') || args.source.startsWith('https://')

      const params: ConvertParams = {
        documentTypeCode: flags.type,
        ...(flags['webhook-url'] && {webhookUrl: flags['webhook-url']}),
        ...(flags.metadata && {documentMetadata: JSON.parse(flags.metadata)}),
        ...(isUrl
          ? {url: args.source}
          : {file: readFileSync(args.source), filename: basename(args.source)}),
      }

      if (flags.async) {
        const status = await client.convert.runAsync(params)
        const result = await status.wait({
          onStatus(s) {
            process.stderr.write(JSON.stringify({status: s.status}) + '\n')
          },
        })
        outputJson(result)
      } else {
        const result = await client.convert.run(params)
        outputJson(result)
      }
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}
