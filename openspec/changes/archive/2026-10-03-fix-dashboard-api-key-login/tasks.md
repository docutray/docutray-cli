## 1. Issue and implementation

- [x] 1.1 Create issue #38 and branch `fix/38-dashboard-api-key-login` from current main.
- [x] 1.2 Extend the centralized key validator and remove credential previews from errors.
- [x] 1.3 Correct the dashboard key format in the authentication guide.

## 2. Regression coverage

- [x] 2.1 Cover unprefixed keys, minimum lengths, trimming, malformed input, and errors without credential previews.
- [x] 2.2 Cover saving unprefixed keys through the flag and positional argument with masked success output.

## 3. Verification

- [x] 3.1 Run the complete test suite and TypeScript build.
- [x] 3.2 Verify package contents and installed CLI commands from the tarball in an isolated temporary prefix.
- [x] 3.3 Validate the OpenSpec change and synchronize the input-validation specification.
