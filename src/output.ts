let forceJson = false

export function setForceJson(value: boolean): void {
  forceJson = value
}

export function isInteractive(): boolean {
  if (forceJson) return false
  return process.stdout.isTTY === true
}

export function isStderrInteractive(): boolean {
  if (forceJson) return false
  return process.stderr.isTTY === true
}

export function outputJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n')
}

export function outputError(error: unknown): void {
  const fallbackMessage = error instanceof Error ? error.message : String(error)

  // Duck-type API errors: check for statusCode and body (from SDK's APIError)
  const isApiError =
    error instanceof Error &&
    'statusCode' in error &&
    typeof (error as Record<string, unknown>).statusCode === 'number'
  const statusCode = isApiError ? (error as Record<string, unknown>).statusCode as number : undefined
  const body = isApiError ? (error as Record<string, unknown>).body as Record<string, unknown> | undefined : undefined
  const requestId = isApiError ? (error as Record<string, unknown>).requestId as string | undefined : undefined

  // Extract detailed message from body.error or body.message, falling back to error.message
  const detailMessage =
    (body && typeof body.error === 'string' && body.error) ||
    (body && typeof body.message === 'string' && body.message) ||
    fallbackMessage

  if (isStderrInteractive()) {
    const suffix = statusCode !== undefined ? ` (${statusCode})` : ''
    process.stderr.write(`\u2717 Error: ${detailMessage}${suffix}\n`)
  } else {
    const output: Record<string, unknown> = {error: detailMessage}
    if (statusCode !== undefined) {
      output.status = statusCode
    }

    if (requestId) {
      output.requestId = requestId
    }

    process.stderr.write(JSON.stringify(output, null, 2) + '\n')
  }
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

  const header = columns.map((col, i) => col.toUpperCase().padEnd(widths[i]!)).join('  ')
  const separator = widths.map((w) => '\u2500'.repeat(w)).join('  ')

  process.stdout.write(header + '\n')
  process.stdout.write(separator + '\n')

  for (const row of rows) {
    const line = columns.map((col, i) => String(row[col] ?? '').padEnd(widths[i]!)).join('  ')
    process.stdout.write(line + '\n')
  }
}

export function outputKeyValue(data: unknown, entries: Array<{key: string; value: string; icon?: string}>): void {
  if (isInteractive()) {
    for (const {key, value, icon} of entries) {
      process.stdout.write(`${icon ? icon + ' ' : '  '}${key}:  ${value}\n`)
    }
  } else {
    outputJson(data)
  }
}

export function outputList(data: unknown, rows: Record<string, unknown>[], columns: string[], footer?: string): void {
  if (isInteractive()) {
    outputTable(rows, columns)
    if (footer) {
      process.stdout.write('\n' + footer + '\n')
    }
  } else {
    outputJson(data)
  }
}

export function outputSuccess(data: unknown, message: string): void {
  if (isInteractive()) {
    process.stdout.write(`\u2713 ${message}\n`)
  } else {
    outputJson(data)
  }
}
