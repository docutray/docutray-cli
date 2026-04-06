## Why

A professional CLI needs tab-completion for discoverability and reduced friction. Additionally, when users omit required arguments or flags, oclif shows a terse error without usage context — standard CLIs like `gh`, `git`, and `kubectl` show the error alongside the command's help. This improves the developer experience for both human users and AI agents.

Closes #9.

## What Changes

- Add shell autocomplete (bash, zsh, fish) via `@oclif/plugin-autocomplete`
- Create `BaseCommand` class that intercepts missing arg/flag errors and shows command help alongside the error in TTY mode
- Migrate all 10 commands from `extends Command` to `extends BaseCommand`
- Restructure command `run()` methods so parse errors propagate to `BaseCommand.catch()` instead of being swallowed by the command's own try/catch

## Capabilities

### New Capabilities
- `shell-autocomplete`: Tab-completion for commands, subcommands, and flags via `@oclif/plugin-autocomplete`
- `error-ux-missing-input`: Improved error UX when required arguments or flags are missing — shows error + command help in TTY, JSON error in pipe mode

### Modified Capabilities
_(none — no existing spec-level behavior changes)_

## Impact

- **`package.json`**: New dependency `@oclif/plugin-autocomplete`, new `oclif.plugins` config
- **`src/base-command.ts`** (new): Abstract base class with `catch()` override
- **`src/commands/*.ts`** (all 10): Import change (`Command` → `BaseCommand`), `this.parse()` moved outside try/catch
- **Tests**: New `test/base-command.test.ts` with 3 test cases
- **No breaking changes**: Autocomplete is opt-in; error UX improvement is additive
