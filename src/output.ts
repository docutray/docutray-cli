export function outputJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n')
}

export function outputError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  const output: Record<string, unknown> = {error: message}

  if (error instanceof Error && 'status' in error) {
    output.status = (error as {status: number}).status
  }

  process.stderr.write(JSON.stringify(output, null, 2) + '\n')
}

export function outputTable(rows: Record<string, unknown>[], columns: string[]): void {
  if (rows.length === 0) {
    process.stdout.write('No results found.\n')
    return
  }

  const widths = columns.map((col) => {
    const values = rows.map((row) => String(row[col] ?? ''))
    return Math.max(col.length, ...values.map((v) => v.length))
  })

  const header = columns.map((col, i) => col.padEnd(widths[i]!)).join('  ')
  const separator = widths.map((w) => '-'.repeat(w)).join('  ')

  process.stdout.write(header + '\n')
  process.stdout.write(separator + '\n')

  for (const row of rows) {
    const line = columns.map((col, i) => String(row[col] ?? '').padEnd(widths[i]!)).join('  ')
    process.stdout.write(line + '\n')
  }
}
