# refactor-ts

A CLI tool for performing code refactoring operations like renaming symbols and moving files. Designed to be used by AI agents for automated codebase maintenance.

## Installation

### From GitHub

```bash
# Install from GitHub
npm install github:simonbw/refactor-ts

# Or with full git URL
npm install git+https://github.com/simonbw/refactor-ts.git
```

After install, the `refactor-ts` command is available via `npx refactor-ts` or directly if `node_modules/.bin` is in PATH.

The installer will prompt to install a Claude Code skill that teaches agents how to use the tool.

### Local Development

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

| Command                              | Description                                   |
| ------------------------------------ | --------------------------------------------- |
| `move-symbol <file> <symbol> <dest>` | Move or rename a symbol                       |
| `move-file <source> <destination>`   | Move or rename a file and update imports      |
| `move-directory <source> <dest>`     | Move or rename a directory and update imports |
| `batch [--dry-run]`                  | Execute multiple operations from JSONL stdin  |

### Examples

```bash
# Rename a symbol in place
npx refactor-ts move-symbol src/utils.ts calculateTotal computeTotal

# Move a symbol to a different file
npx refactor-ts move-symbol src/utils.ts calculateTotal src/math.ts

# Move or rename a file
npx refactor-ts move-file src/utils.ts src/helpers/utils.ts

# Move or rename a directory
npx refactor-ts move-directory src/utils src/helpers

# Batch operations from JSONL stdin
echo '{"op": "move-file", "src": "src/old.ts", "dest": "src/new.ts"}' | npx refactor-ts batch
cat operations.jsonl | npx refactor-ts batch --dry-run
```

### Batch Command

The `batch` command executes multiple refactoring operations from JSONL input (one JSON object per line). This is optimized for agents that need to perform many operations efficiently - a single ts-morph project instance is shared across all operations.

**Input format (JSONL via stdin):**
```jsonl
{"op": "move-file", "src": "src/old.ts", "dest": "src/new.ts"}
{"op": "move-symbol", "file": "src/utils.ts", "symbol": "oldName", "dest": "newName"}
{"op": "move-directory", "src": "src/lib", "dest": "src/helpers"}
```

**Output format:**
```json
{
  "success": true,
  "operations": [
    { "index": 0, "operation": {...}, "result": {...} }
  ],
  "summary": {
    "total": 3,
    "succeeded": 3,
    "failed": 0,
    "filesModified": [...]
  }
}
```

**Options:**
- `--dry-run`: Execute operations in memory without saving changes to disk

**Behavior:**
- Operations execute sequentially; later operations see changes from earlier ones
- Continues on error and reports all results
- Exit code is 0 only if all operations succeed

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
