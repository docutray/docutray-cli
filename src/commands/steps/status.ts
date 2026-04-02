import {Args, Command} from '@oclif/core'

import {createClient} from '../../client.js'
import {outputError, outputJson} from '../../output.js'

export default class StepsStatus extends Command {
  static args = {
    'execution-id': Args.string({description: 'Step execution ID to query', required: true}),
  }

  static description = `Query the current status of a step execution by its execution ID. Use this to check progress on executions started with --no-wait, or to retrieve results after receiving a webhook notification. Returns the execution status, progress, and result data when complete.`

  static examples = [
    {command: '<%= config.bin %> steps status exec_abc123', description: 'Check the status of an execution'},
    {command: '<%= config.bin %> steps status exec_abc123 | jq .status', description: 'Extract just the status field (useful for scripts)'},
    {command: '<%= config.bin %> steps run my-step doc.pdf --no-wait | jq -r .id | xargs docutray steps status', description: 'Start async execution then check its status'},
  ]

  async run(): Promise<void> {
    try {
      const {args} = await this.parse(StepsStatus)
      const client = createClient()
      const result = await client.steps.getStatus(args['execution-id'])
      outputJson(result)
    } catch (error) {
      outputError(error)
      this.exit(1)
    }
  }
}
