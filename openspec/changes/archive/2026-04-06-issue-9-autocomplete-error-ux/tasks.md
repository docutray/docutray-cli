## 1. Shell Autocomplete Plugin

- [x] 1.1 Install `@oclif/plugin-autocomplete` as a dependency
- [x] 1.2 Add `@oclif/plugin-autocomplete` to `oclif.plugins` array in `package.json`
- [x] 1.3 Verify `docutray autocomplete` command is available after build

## 2. BaseCommand Class

- [x] 2.1 Create `src/base-command.ts` with abstract `BaseCommand` extending oclif `Command`
- [x] 2.2 Implement `catch()` override that detects missing arg/flag CLIErrors
- [x] 2.3 In TTY mode: display error icon + message, then show full command help via oclif `Help` class
- [x] 2.4 In pipe mode: output JSON error to stderr via `outputError()`

## 3. Command Migration

- [x] 3.1 Migrate all 10 commands from `extends Command` to `extends BaseCommand`
- [x] 3.2 Move `this.parse()` and `setForceJson()` outside the try/catch in each command's `run()` method
- [x] 3.3 Verify SDK/API errors are still caught by the command's own try/catch

## 4. Testing

- [x] 4.1 Add test: missing required arg in TTY mode shows error + help
- [x] 4.2 Add test: missing required arg in pipe mode outputs JSON error
- [x] 4.3 Add test: missing required flag in TTY mode shows error + help
- [x] 4.4 Verify all existing tests still pass

## 5. Validation

- [x] 5.1 Build passes (`npm run build`)
- [x] 5.2 All tests pass (`npm run test`) — 34/34
