import {Args, Command, Flags} from '@oclif/core'
import type {StepsRunParams} from 'docutray'
import {readFileSync} from 'node:fs'
import {basename} from 'node:path'

import {createClient} from '../../client.js'
import {outputError, outputJson} from '../../output.js'

export default class StepsRun extends Command {
  static args = {
    'step-id': Args.string({description: 'Step ID to execute', required: true}),
    source: Args.string({description: 'File path or URL to process', required: true}),
  }

  static description = `Execute a processing step on a document. Steps are reusable processing pipelines configured in the DocuTray dashboard. By default, the command waits for the step to complete and returns the result. Use --no-wait to return the execution status immediately without polling. Accepts a local file path or a public URL as the document source.`

  static examples = [
    {command: '<%= config.bin %> steps run extract-fields invoice.pdf', description: 'Run a step on a local file and wait for results'},
    {command: '<%= config.bin %> steps run extract-fields https://example.com/doc.pdf', description: 'Run a step on a document URL'},
    {command: '<%= config.bin %> steps run extract-fields invoice.pdf --no-wait', description: 'Start execution and return immediately (async)'},
    {command: '<%= config.bin %> steps run extract-fields invoice.pdf --metadata \'{"ref":"order-123"}\'', description: 'Attach custom metadata to the execution'},
    {command: '<%= config.bin %> steps run extract-fields invoice.pdf --webhook-url https://example.com/hook', description: 'Receive a webhook notification on completion'},
  ]

  static flags = {
    metadata: Flags.string({description: 'JSON metadata to attach to the execution (e.g. \'{"key":"value"}\')'}),
    'no-wait': Flags.boolean({default: false, description: 'Return immediately with execution status instead of waiting for completion (default: false)'}),
    'webhook-url': Flags.string({description: 'Webhook URL to receive a POST notification when the step completes'}),
  }

  async run(): Promise<void> {
    try {
      const {args, flags} = await this.parse(StepsRun)
      const client = createClient()
      const isUrl = args.source.startsWith('http://') || args.source.startsWith('https://')

      const params: StepsRunParams = {
        stepId: args['step-id'],
        ...(flags['webhook-url'] && {webhookUrl: flags['webhook-url']}),
        ...(flags.metadata && {documentMetadata: JSON.parse(flags.metadata)}),
        ...(isUrl
          ? {url: args.source}
          : {file: readFileSync(args.source), filename: basename(args.source)}),
      }

      const status = await client.steps.runAsync(params)

      if (flags['no-wait']) {
        outputJson(status)
      } else {
        const result = await status.wait({
          onStatus(s) {
            process.stderr.write(JSON.stringify({status: s.status}) + '\n')
          },
        })
        outputJson(result)
      }
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}
