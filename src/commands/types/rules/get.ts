import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../../base-command.js'
import {createClient} from '../../../client.js'
import {isInteractive, outputError, outputJson, setForceJson} from '../../../output.js'
import {resolveDocumentTypeId} from '../../../resolve-type.js'

export default class TypesRulesGet extends BaseCommand {
  static args = {
    code: Args.string({description: 'Document type code', required: true}),
  }

  static description = `Get the DSL business rules of a document type. Rules are validated against the data extracted from each document, after the JSON Schema. Use --raw to print only the rules text, e.g. to save it to a file, edit it and upload it again with "types rules set".`

  static examples = [
    {command: '<%= config.bin %> types rules get invoice', description: 'Show the rules of a document type'},
    {command: '<%= config.bin %> types rules get invoice --raw > rules.dsl', description: 'Save the rules to a file'},
    {command: '<%= config.bin %> types rules get invoice --json', description: 'Output as JSON ({codeType, dslRules})'},
  ]

  static flags = {
    json: Flags.boolean({default: false, description: 'Output as JSON (default when piped)', exclusive: ['raw']}),
    raw: Flags.boolean({default: false, description: 'Print only the rules text (empty when the type has no rules)', exclusive: ['json']}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(TypesRulesGet)
    setForceJson(flags.json)

    try {
      const client = createClient()
      const id = await resolveDocumentTypeId(client, args.code)
      const result = await client.documentTypes.get(id)
      const dslRules = result.dslRules || null

      if (flags.raw) {
        if (dslRules) process.stdout.write(dslRules.endsWith('\n') ? dslRules : dslRules + '\n')
      } else if (isInteractive()) {
        process.stdout.write(dslRules ? dslRules.replace(/\n?$/, '\n') : `No DSL rules defined for "${result.codeType}".\n`)
      } else {
        outputJson({codeType: result.codeType, dslRules})
      }
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}
