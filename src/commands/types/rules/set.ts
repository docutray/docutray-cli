import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../../base-command.js'
import {createClient} from '../../../client.js'
import {outputError, outputSuccess, setForceJson} from '../../../output.js'
import {resolveDocumentTypeId} from '../../../resolve-type.js'
import {readRulesInput} from '../../../rules-input.js'

export default class TypesRulesSet extends BaseCommand {
  static args = {
    code: Args.string({description: 'Document type code', required: true}),
    rules: Args.string({description: 'DSL rules: file path, "-" to read from stdin, or inline text. A value that looks like a path (no spaces, with / or a .dsl/.txt extension) must exist'}),
  }

  static description = `Save the DSL business rules of a document type of your organization, replacing the stored ones. Public platform types cannot be modified. Rules that fail to compile are rejected with their line and column, and nothing is saved. Use "types rules test" first to try rules against sample data without saving them, and --clear to remove all rules.`

  static examples = [
    {command: '<%= config.bin %> types rules set invoice rules.dsl', description: 'Save rules from a file'},
    {command: 'cat rules.dsl | <%= config.bin %> types rules set invoice -', description: 'Save rules from stdin'},
    {command: '<%= config.bin %> types rules set invoice --clear', description: 'Remove all rules from the document type'},
  ]

  static flags = {
    clear: Flags.boolean({default: false, description: 'Remove all DSL rules from the document type'}),
    json: Flags.boolean({default: false, description: 'Output as JSON (default when piped)'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(TypesRulesSet)
    setForceJson(flags.json)

    try {
      if (flags.clear && args.rules !== undefined) {
        throw new Error('Pass either RULES or --clear, not both')
      }

      if (!flags.clear && args.rules === undefined) {
        throw new Error('Missing RULES: pass a file path, "-" for stdin, or inline text (or --clear to remove the rules)')
      }

      const dslRules = flags.clear ? null : readRulesInput(args.rules!)
      if (dslRules !== null && dslRules.trim() === '') {
        throw new Error('The rules are empty. Use --clear to remove the rules of a document type.')
      }

      const client = createClient()
      const id = await resolveDocumentTypeId(client, args.code)
      const result = await client.documentTypes.update(id, {dslRules})

      outputSuccess(
        {codeType: result.codeType, dslRules: result.dslRules ?? null, id: result.id},
        flags.clear ? `DSL rules removed from "${result.codeType}"` : `DSL rules saved for "${result.codeType}"`,
      )
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}
