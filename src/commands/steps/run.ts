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

  static description = 'Execute a processing step on a document'

  static examples = [
    '$ docutray steps run my-step invoice.pdf',
    '$ docutray steps run my-step https://example.com/doc.pdf',
    '$ docutray steps run my-step invoice.pdf --metadata \'{"key":"value"}\'',
    '$ docutray steps run my-step invoice.pdf --no-wait',
  ]

  static flags = {
    metadata: Flags.string({description: 'JSON metadata to attach to the execution'}),
    'no-wait': Flags.boolean({default: false, description: 'Return immediately without waiting for completion'}),
    'webhook-url': Flags.string({description: 'Webhook URL for completion notification'}),
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
