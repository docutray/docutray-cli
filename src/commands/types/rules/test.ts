import {Args, Flags} from '@oclif/core'
import {isValidationValid, type ValidationResult} from 'docutray'

import {BaseCommand} from '../../../base-command.js'
import {createClient} from '../../../client.js'
import {isInteractive, outputError, outputJson, setForceJson} from '../../../output.js'
import {resolveDocumentTypeId} from '../../../resolve-type.js'
import {readDataInput, readRulesInput} from '../../../rules-input.js'
import {formatValidationOutcome} from '../../../validation-output.js'

export default class TypesRulesTest extends BaseCommand {
  static args = {
    code: Args.string({description: 'Document type code', required: true}),
  }

  static description = `Validate document data against a document type's JSON Schema and DSL rules without saving anything. By default the stored rules are used; pass --rules to try new rules (dry-run) before saving them with "types rules set". Exit codes: 0 when the data is valid, 1 when it is invalid, 2 on any other error (API, rules that fail to compile, invalid input), so it can gate scripts and CI.`

  static examples = [
    {command: '<%= config.bin %> types rules test invoice --data extracted.json', description: 'Validate data against the stored rules'},
    {command: '<%= config.bin %> types rules test invoice --data extracted.json --rules rules.dsl', description: 'Try new rules without saving them'},
    {command: '<%= config.bin %> convert invoice.pdf -t invoice | jq .data | <%= config.bin %> types rules test invoice --data -', description: 'Validate freshly extracted data from stdin'},
  ]

  static flags = {
    data: Flags.string({description: 'Document data to validate: JSON file path, inline JSON, or "-" for stdin', required: true}),
    json: Flags.boolean({default: false, description: 'Output as JSON (default when piped)'}),
    rules: Flags.string({description: 'DSL rules to test instead of the stored ones: file path, "-" for stdin, or inline text. A value that looks like a path (no spaces, with / or a .dsl/.txt extension) must exist'}),
  }

  protected inputErrorExitCode = 2

  async run(): Promise<void> {
    const {args, flags} = await this.parse(TypesRulesTest)
    setForceJson(flags.json)

    let valid = true
    try {
      if (flags.data === '-' && flags.rules === '-') {
        throw new Error('Only one of --data and --rules can read from stdin')
      }

      const data = readDataInput(flags.data)
      const params = flags.rules === undefined ? undefined : {dslRules: readRulesInput(flags.rules)}

      if (params?.dslRules.trim() === '') throw new Error('The rules are empty. Omit --rules to use the stored rules.')

      const client = createClient()
      const id = await resolveDocumentTypeId(client, args.code)
      const result = await client.documentTypes.validate(id, data, params)
      valid = isValidationValid(result)

      if (isInteractive()) {
        process.stdout.write(formatValidationOutcome({issues: issuesOf(result), valid}).join('\n') + '\n')
      } else {
        outputJson(result)
      }
    } catch (error) {
      outputError(error)
      this.exit(2)
    }

    if (!valid) this.exit(1)
  }
}

// API deployments that predate `issues` only send the error/warning summaries.
function issuesOf(result: ValidationResult): Array<{message: string; severity: 'error' | 'warning'}> {
  if (result.issues) return result.issues
  return [
    ...(result.errors?.messages ?? []).map((message) => ({message, severity: 'error' as const})),
    ...(result.warnings?.messages ?? []).map((message) => ({message, severity: 'warning' as const})),
  ]
}
