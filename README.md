# refactor-ts

A CLI tool for performing code refactoring operations like renaming symbols and moving files. Designed to be used by AI agents for automated codebase maintenance.

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
npx refactor-ts --help
```

All commands output JSON for easy parsing by agents.

## Commands

| Command                              | Description                              |
| ------------------------------------ | ---------------------------------------- |
| `move-symbol <file> <symbol> <dest>` | Move or rename a symbol                  |
| `move-file <source> <destination>`   | Move or rename a file and update imports |

### Examples

```bash
# Rename a symbol in place
npx refactor-ts move-symbol src/utils.ts calculateTotal computeTotal

# Move a symbol to a different file
npx refactor-ts move-symbol src/utils.ts calculateTotal src/math.ts

# Move or rename a file
npx refactor-ts move-file src/utils.ts src/helpers/utils.ts
```

### Output Format

```json
{
  "success": true,
  "filesModified": ["src/foo.ts", "src/bar.ts"],
  "error": null
}
```

## Development

Uses [tsgo](https://github.com/microsoft/typescript-go) (the native TypeScript compiler) for fast builds.

```bash
npm run dev    # Watch mode - recompiles on changes
npm run build  # One-time build
npm test       # Run tests
```

## Testing

Tests use Node's built-in test runner with `--experimental-strip-types` to run TypeScript directly.

```bash
npm test
```

Test fixtures are in `test/fixtures/`. Each test copies a fixture to a temp directory, runs the refactoring command, and verifies the results.

## License

MIT
