## Purpose

Shell tab-completion for CLI commands, subcommands, and flags via `@oclif/plugin-autocomplete`. Supports bash, zsh, and fish.

## Requirements

### Requirement: Shell autocomplete setup command
The CLI SHALL provide an `autocomplete` command that generates and installs shell completion scripts for bash, zsh, and fish.

#### Scenario: Setup autocomplete for zsh
- **WHEN** user runs `docutray autocomplete zsh`
- **THEN** the CLI generates a zsh completion script and outputs setup instructions

#### Scenario: Setup autocomplete for bash
- **WHEN** user runs `docutray autocomplete bash`
- **THEN** the CLI generates a bash completion script and outputs setup instructions

### Requirement: Command completion
After autocomplete setup, the shell SHALL complete top-level commands and topic subcommands.

#### Scenario: Complete top-level commands
- **WHEN** user types `docutray <TAB>` in a configured shell
- **THEN** the shell shows available commands (convert, identify, types, steps, status, login, logout, autocomplete)

#### Scenario: Complete subcommands
- **WHEN** user types `docutray types <TAB>` in a configured shell
- **THEN** the shell shows subcommands (list, get, export)

### Requirement: Flag completion
After autocomplete setup, the shell SHALL complete flags for any command.

#### Scenario: Complete flags for a command
- **WHEN** user types `docutray convert --<TAB>` in a configured shell
- **THEN** the shell shows available flags (--type, --async, --json, --metadata, --webhook-url)
