import {Args, Command, Flags} from '@oclif/core'

import {createClient} from '../../client.js'
import {outputError, outputKeyValue, setForceJson} from '../../output.js'

export default class StepsStatus extends Command {
  static args = {
    'execution-id': Args.string({description: 'Step execution ID to query', required: true}),
  }

  static description = `Query the current status of a step execution by its execution ID. Use this to check progress on executions started with --no-wait, or to retrieve results after receiving a webhook notification. Returns the execution status, progress, and result data when complete.`

  static examples = [
    {command: '<%= config.bin %> steps status exec_abc123', description: 'Check the status of an execution'},
    {command: '<%= config.bin %> steps status exec_abc123 --json', description: 'Output as JSON'},
    {command: '<%= config.bin %> steps run my-step doc.pdf --no-wait | jq -r .id | xargs docutray steps status', description: 'Start async execution then check its status'},
  ]

  static flags = {
    json: Flags.boolean({default: false, description: 'Output as JSON (default when piped)'}),
  }

  async run(): Promise<void> {
    try {
      const {args, flags} = await this.parse(StepsStatus)
      if (flags.json) setForceJson(true)

      const client = createClient()
      const result = await client.steps.getStatus(args['execution-id'])

      const r = result as unknown as Record<string, unknown>
      outputKeyValue(result, [
        {key: 'Execution ID', value: String(r.id || args['execution-id'])},
        {key: 'Status', value: String(result.status), icon: result.status === 'ERROR' ? '\u2717' : '\u25cb'},
        ...(r.progress !== undefined ? [{key: 'Progress', value: `${r.progress}%`}] : []),
        ...(r.error ? [{key: 'Error', value: String(r.error)}] : []),
      ])
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}
