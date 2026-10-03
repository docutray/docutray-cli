## ADDED Requirements

### Requirement: Compatible API key format validation on login

The CLI SHALL trim and validate API keys supplied through the positional argument, `--api-key`, or the existing interactive key prompt before saving configuration. It SHALL accept `dt` followed by at least 20 URL-safe characters or an unprefixed token of at least 32 URL-safe characters. URL-safe characters SHALL be `A-Z`, `a-z`, `0-9`, `_`, and `-`. This check SHALL validate format only, leaving authenticity and organization authorization to the API.

#### Scenario: Unprefixed dashboard key accepted

- **GIVEN** a dashboard key containing 64 URL-safe characters without a `dt` prefix
- **WHEN** the user supplies it as the positional argument or `--api-key`
- **THEN** login saves the original key and exits successfully
- **AND** success output contains a masked key without exposing the full credential

#### Scenario: Existing OAuth and legacy keys accepted

- **GIVEN** an OAuth key or legacy `dt_live_` / `dt_test_` key satisfying the existing 20-character payload minimum
- **WHEN** the user logs in with that key
- **THEN** login continues to accept and save it

#### Scenario: Surrounding whitespace trimmed

- **GIVEN** a supported key surrounded by whitespace
- **WHEN** the key is validated
- **THEN** the validator returns the unchanged key with surrounding whitespace removed

#### Scenario: Opaque minimum length enforced

- **GIVEN** an unprefixed URL-safe token
- **WHEN** it contains at least 32 characters
- **THEN** the format validator accepts it
- **AND** a token with fewer than 32 characters is rejected

#### Scenario: Malformed input rejected without saving or exposing credentials

- **GIVEN** empty input, a short token, or a token containing invalid characters or embedded whitespace
- **WHEN** the user supplies it to login
- **THEN** login exits with a non-zero code without writing configuration
- **AND** the error begins with `Invalid API key format` without including the supplied credential or its prefix
