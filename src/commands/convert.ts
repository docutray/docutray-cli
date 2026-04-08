import {Args, Flags} from '@oclif/core'
import type {ConvertParams} from 'docutray'
import {readFileSync} from 'node:fs'
import {basename} from 'node:path'

import {BaseCommand} from '../base-command.js'
import {createClient} from '../client.js'
import {isStderrInteractive, outputError, outputJson, setForceJson} from '../output.js'
import {parseJsonFlag, validateSource, validateUrl} from '../validators.js'

export default class Convert extends BaseCommand {
  static args = {
    source: Args.string({description: 'File path or URL to convert', required: true}),
  }

  static description = `Convert a document to structured data using a specified document type schema. Accepts a local file path or a public URL as the source. By default, processing is synchronous \u2014 the command waits and returns the extracted data. Use --async for long-running documents to poll for completion with status updates on stderr.`

  static examples = [
    {command: '<%= config.bin %> convert invoice.pdf --type electronic-invoice', description: 'Convert a local PDF using a document type'},
    {command: '<%= config.bin %> convert https://example.com/doc.pdf -t electronic-invoice', description: 'Convert a document from a URL'},
    {command: '<%= config.bin %> convert invoice.pdf -t electronic-invoice --async', description: 'Use async processing with status polling'},
    {command: '<%= config.bin %> convert large-doc.pdf -t electronic-invoice --async --timeout 600', description: 'Async with 10-minute timeout for large documents'},
    {command: '<%= config.bin %> convert receipt.jpg -t receipt --webhook-url https://example.com/hook', description: 'Convert with webhook notification on completion'},
    {command: '<%= config.bin %> convert invoice.pdf -t electronic-invoice --metadata \'{"ref":"order-123"}\'', description: 'Attach custom metadata to the conversion'},
  ]

  static flags = {
    async: Flags.boolean({default: false, description: 'Use async processing with polling (default: false). Status updates are emitted to stderr.'}),
    json: Flags.boolean({default: false, description: 'Output as JSON (default when piped)'}),
    metadata: Flags.string({description: 'JSON metadata to attach to the conversion (e.g. \'{"key":"value"}\')'}),
    timeout: Flags.integer({default: 300, description: 'Polling timeout in seconds for async processing', min: 1}),
    type: Flags.string({char: 't', description: 'Document type code to use for extraction (see: docutray types list)', required: true}),
    'webhook-url': Flags.string({description: 'Webhook URL to receive a POST notification when conversion completes'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Convert)
    setForceJson(flags.json)

    try {
      const client = createClient()
      const {isUrl} = validateSource(args.source)

      const params: ConvertParams = {
        documentTypeCode: flags.type,
        ...(flags['webhook-url'] && {webhookUrl: validateUrl(flags['webhook-url'], '--webhook-url')}),
        ...(flags.metadata && {documentMetadata: parseJsonFlag(flags.metadata, '--metadata')}),
        ...(isUrl
          ? {url: args.source}
          : {file: readFileSync(args.source), filename: basename(args.source)}),
      }

      if (flags.async) {
        const status = await client.convert.runAsync(params)
        const conversionId = status.conversion_id

        if (isStderrInteractive()) {
          process.stderr.write(`⟳ Conversion ${conversionId}: ${status.status}\n`)
        } else {
          process.stderr.write(JSON.stringify({conversionId, status: status.status}) + '\n')
        }

        let result
        try {
          result = await status.wait({
            onStatus(s) {
              if (isStderrInteractive()) {
                process.stderr.write(`⟳ Conversion ${conversionId}: ${s.status}\n`)
              } else {
                process.stderr.write(JSON.stringify({conversionId, status: s.status}) + '\n')
              }
            },
            timeout: flags.timeout * 1000,
          })
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error)
          const isTimeout = msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('timed out')
          if (isTimeout) {
            throw new Error(`${msg} (conversionId: ${conversionId}). Use the conversion ID to check status later.`)
          }

          throw error
        }

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
