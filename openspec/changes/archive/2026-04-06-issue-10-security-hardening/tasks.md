## 1. Centralized Validators Module

- [x] 1.1 Create `src/validators.ts` with `parseJsonFlag(value, flagName)` function
- [x] 1.2 Add `validateUrl(value, flagName)` function to validators
- [x] 1.3 Add `validateSource(source)` function to validators

## 2. Apply Validators to Commands

- [x] 2.1 Apply `parseJsonFlag` and `validateUrl` in `src/commands/convert.ts`
- [x] 2.2 Apply `validateSource` in `src/commands/convert.ts`
- [x] 2.3 Apply `parseJsonFlag` and `validateUrl` in `src/commands/steps/run.ts`
- [x] 2.4 Apply `validateSource` in `src/commands/steps/run.ts`
- [x] 2.5 Apply `validateSource` in `src/commands/identify.ts`

## 3. File Overwrite Protection

- [x] 3.1 Add `--force` flag and overwrite check to `src/commands/types/export.ts`

## 4. Testing

- [x] 4.1 Add unit tests for `src/validators.ts` (all three functions, valid and invalid inputs)
- [x] 4.2 Add integration tests for JSON metadata validation in convert and steps run
- [x] 4.3 Add integration tests for webhook URL validation in convert and steps run
- [x] 4.4 Add integration tests for source file validation in convert, identify, and steps run
- [x] 4.5 Add integration tests for `--force` flag in types export

## 5. Validation

- [x] 5.1 Run full test suite and verify all tests pass
- [x] 5.2 Run lint and type check
