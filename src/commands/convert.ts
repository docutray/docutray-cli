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

  static description = `Convert a document to structured data using a specified document type schema. Accepts a local file path or a public URL as the source. By default, processing is synchronous — the command waits and returns the extracted data. Use --async for long-running documents to poll for completion with status updates on stderr.`

  static examples = [
    {command: '<%= config.bin %> convert invoice.pdf --type electronic-invoice', description: 'Convert a local PDF using a document type'},
    {command: '<%= config.bin %> convert https://example.com/doc.pdf -t electronic-invoice', description: 'Convert a document from a URL'},
    {command: '<%= config.bin %> convert invoice.pdf -t electronic-invoice --async', description: 'Use async processing with status polling'},
    {command: '<%= config.bin %> convert receipt.jpg -t receipt --webhook-url https://example.com/hook', description: 'Convert with webhook notification on completion'},
    {command: '<%= config.bin %> convert invoice.pdf -t electronic-invoice --metadata \'{"ref":"order-123"}\'', description: 'Attach custom metadata to the conversion'},
  ]

  static flags = {
    async: Flags.boolean({default: false, description: 'Use async processing with polling (default: false). Status updates are emitted to stderr as JSON.'}),
    metadata: Flags.string({description: 'JSON metadata to attach to the conversion (e.g. \'{"key":"value"}\')'}),
    type: Flags.string({char: 't', description: 'Document type code to use for extraction (see: docutray types list)', required: true}),
    'webhook-url': Flags.string({description: 'Webhook URL to receive a POST notification when conversion completes'}),
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
