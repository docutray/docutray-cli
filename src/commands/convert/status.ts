import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {createClient} from '../../client.js'
import {isInteractive, outputError, outputJson, outputKeyValue, setForceJson} from '../../output.js'
import {formatConversionValidation} from '../../validation-output.js'

export default class ConvertStatus extends BaseCommand {
  static args = {
    'conversion-id': Args.string({description: 'Conversion ID returned by "convert --async"', required: true}),
  }

  static description = `Query the status of a conversion by its conversion ID. Use this to check on a conversion started with --async after a timeout, or to retrieve its result later. Returns the conversion status, the extracted data and its validation against the document type's JSON Schema and DSL rules when complete.`

  static examples = [
    {command: '<%= config.bin %> convert status conv_abc123', description: 'Check the status of a conversion'},
    {command: '<%= config.bin %> convert status conv_abc123 --json', description: 'Output as JSON'},
    {command: '<%= config.bin %> convert status conv_abc123 | jq .validation', description: 'Show only the validation of the extracted data'},
  ]

  static flags = {
    json: Flags.boolean({default: false, description: 'Output as JSON (default when piped)'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(ConvertStatus)
    setForceJson(flags.json)

    try {
      const client = createClient()
      const result = await client.convert.getStatus(args['conversion-id'])

      if (!isInteractive()) {
        outputJson(result)
        return
      }

      const icon = result.status === 'SUCCESS' ? '✓' : result.status === 'ERROR' ? '✗' : '○'
      outputKeyValue(result, [
        {key: 'Conversion ID', value: result.conversion_id || args['conversion-id']},
        {key: 'Status', value: String(result.status), icon},
        ...(result.document_type_code ? [{key: 'Document type', value: result.document_type_code}] : []),
        ...(result.original_filename ? [{key: 'File', value: result.original_filename}] : []),
        ...(result.request_timestamp ? [{key: 'Requested', value: result.request_timestamp}] : []),
        ...(result.response_timestamp ? [{key: 'Completed', value: result.response_timestamp}] : []),
        ...(result.error ? [{key: 'Error', value: result.error}] : []),
      ])

      const validation = formatConversionValidation(result.validation)
      if (validation.length > 0) {
        process.stdout.write('\n' + validation.join('\n') + '\n')
      }

      if (result.data) {
        process.stdout.write('\nData:\n' + JSON.stringify(result.data, null, 2) + '\n')
      }
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}
