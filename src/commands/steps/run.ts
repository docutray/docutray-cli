import {Args, Flags} from '@oclif/core'
import type {StepsRunParams} from 'docutray'
import {readFileSync} from 'node:fs'
import {basename} from 'node:path'

import {BaseCommand} from '../../base-command.js'
import {createClient} from '../../client.js'
import {isStderrInteractive, outputError, outputJson, outputWarning, setForceJson} from '../../output.js'
import {parseJsonFlag, validateSource} from '../../validators.js'

export default class StepsRun extends BaseCommand {
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
  ]

  static flags = {
    json: Flags.boolean({default: false, description: 'Output as JSON (default when piped)'}),
    metadata: Flags.string({description: 'JSON metadata to attach to the execution (e.g. \'{"key":"value"}\')'}),
    'no-wait': Flags.boolean({default: false, description: 'Return immediately with execution status instead of waiting for completion (default: false)'}),
    // Deprecated: the API never read it. Remove in the next minor release.
    'webhook-url': Flags.string({description: 'Deprecated, has no effect: webhooks are configured per organization', hidden: true}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(StepsRun)
    setForceJson(flags.json)

    try {
      const client = createClient()
      const {isUrl} = validateSource(args.source)

      if (flags['webhook-url'] !== undefined) {
        outputWarning('--webhook-url has no effect and will be removed; webhooks are configured per organization')
      }

      const params: StepsRunParams = {
        stepId: args['step-id'],
        ...(flags.metadata && {documentMetadata: parseJsonFlag(flags.metadata, '--metadata')}),
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
            if (isStderrInteractive()) {
              process.stderr.write(`  Status: ${s.status}\n`)
            } else {
              process.stderr.write(JSON.stringify({status: s.status}) + '\n')
            }
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
