import {Args, Command, Flags} from '@oclif/core'
import type {IdentifyParams} from 'docutray'
import {readFileSync} from 'node:fs'
import {basename} from 'node:path'

import {createClient} from '../client.js'
import {isStderrInteractive, outputError, outputJson, outputList, setForceJson} from '../output.js'

export default class Identify extends Command {
  static args = {
    source: Args.string({description: 'File path or URL to identify', required: true}),
  }

  static description = `Identify the type of a document by analyzing its content. Returns the best-matching document type along with alternative matches ranked by confidence score. Use --types to restrict identification to a specific set of document types. Accepts a local file path or a public URL.`

  static examples = [
    {command: '<%= config.bin %> identify document.pdf', description: 'Identify a local document'},
    {command: '<%= config.bin %> identify https://example.com/doc.pdf', description: 'Identify a document from a URL'},
    {command: '<%= config.bin %> identify document.pdf --types invoice,receipt,contract', description: 'Restrict to specific document types'},
    {command: '<%= config.bin %> identify document.pdf --json', description: 'Force JSON output'},
    {command: '<%= config.bin %> identify document.pdf --async', description: 'Use async processing with status polling'},
  ]

  static flags = {
    async: Flags.boolean({default: false, description: 'Use async processing with polling (default: false). Status updates are emitted to stderr.'}),
    json: Flags.boolean({default: false, description: 'Output as JSON (default when piped)'}),
    types: Flags.string({description: 'Comma-separated list of document type codes to restrict identification (e.g. invoice,receipt)'}),
  }

  async run(): Promise<void> {
    try {
      const {args, flags} = await this.parse(Identify)
      setForceJson(flags.json)

      const client = createClient()
      const isUrl = args.source.startsWith('http://') || args.source.startsWith('https://')

      const params: IdentifyParams = {
        ...(flags.types && {documentTypeCodeOptions: flags.types.split(',').map((t) => t.trim())}),
        ...(isUrl
          ? {url: args.source}
          : {file: readFileSync(args.source), filename: basename(args.source)}),
      }

      const result = flags.async
        ? await (async () => {
            const status = await client.identify.runAsync(params)
            return status.wait({
              onStatus(s) {
                if (isStderrInteractive()) {
                  process.stderr.write(`  Status: ${s.status}\n`)
                } else {
                  process.stderr.write(JSON.stringify({status: s.status}) + '\n')
                }
              },
            })
          })()
        : await client.identify.run(params)

      if (result.document_type) {
        const rows = [
          {code: result.document_type.code, confidence: result.document_type.confidence, name: result.document_type.name},
          ...(result.alternatives || []).map((alt: {code: string; confidence: number; name: string}) => ({
            code: alt.code,
            confidence: alt.confidence,
            name: alt.name,
          })),
        ]
        outputList(result, rows, ['code', 'name', 'confidence'])
      } else {
        outputJson(result)
      }
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}
