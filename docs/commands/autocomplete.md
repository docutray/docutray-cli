`docutray autocomplete`
=======================

Display autocomplete installation instructions.

* [`docutray autocomplete [SHELL]`](#docutray-autocomplete-shell)

## `docutray autocomplete [SHELL]`

Display autocomplete installation instructions.

```
USAGE
  $ docutray autocomplete [SHELL] [-r]

ARGUMENTS
  [SHELL]  (zsh|bash|powershell) Shell type

FLAGS
  -r, --refresh-cache  Refresh cache (ignores displaying instructions)

DESCRIPTION
  Display autocomplete installation instructions.

EXAMPLES
  $ docutray autocomplete

  $ docutray autocomplete bash

  $ docutray autocomplete zsh

  $ docutray autocomplete powershell

  $ docutray autocomplete --refresh-cache

DOCUMENTATION
  Learn more: https://docs.docutray.com/cli/autocomplete
```

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v3.2.45/src/commands/autocomplete/index.ts)_
