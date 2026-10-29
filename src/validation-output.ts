import {type ConversionValidation, isValidationOutcome, isValidationSystemFailure, type ValidationIssue} from 'docutray'

function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`
}

function formatIssue(issue: ValidationIssue): string {
  const icon = issue.severity === 'error' ? '✗' : '⚠'
  const field = issue.field === '' ? '(root)' : issue.field
  const origin = [issue.code, issue.rule ? `${issue.source}: ${issue.rule}` : issue.source].filter(Boolean).join(', ')
  return `  ${icon} ${field}: ${issue.message} [${origin}]`
}

/**
 * Human-readable lines for a validation outcome: a summary line followed by
 * one line per issue. Shared by the validation of a conversion and the
 * dry-run of DSL rules.
 */
export function formatValidationOutcome(outcome: {issues: ValidationIssue[]; valid: boolean}): string[] {
  const errors = outcome.issues.filter((i) => i.severity === 'error').length
  const warnings = outcome.issues.length - errors
  const counts = `${plural(errors, 'error')}, ${plural(warnings, 'warning')}`
  const summary = outcome.valid ? `✓ valid (${counts})` : `✗ invalid (${counts})`
  return [`Validation:  ${summary}`, ...outcome.issues.map((issue) => formatIssue(issue))]
}

/**
 * Human-readable lines for the validation attached to a conversion, or none
 * when the API did not send the field (deployments that predate it).
 */
export function formatConversionValidation(validation: ConversionValidation | undefined): string[] {
  if (validation === undefined) return []
  if (validation === null) return ['Validation:  skipped (the document type has no JSON Schema and no rules)']
  if (isValidationSystemFailure(validation)) {
    return ['Validation:  ⚠ could not be completed (this does not mean the data is invalid)']
  }

  if (isValidationOutcome(validation)) {
    return formatValidationOutcome({issues: [...validation.errors, ...validation.warnings], valid: validation.valid})
  }

  return ['Validation:  (unrecognized format, use --json)']
}
