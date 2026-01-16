# refactor-ts

CLI tool for agents to perform code refactoring operations like renaming/moving symbols and files.

## Important

Keep README.md up-to-date whenever making changes to the project (new commands, changed usage, etc.).

## Build & Run

```bash
npm install        # Install dependencies
npm run build      # Compile TypeScript to dist/
npm run dev        # Watch mode for development
```

## Usage

```bash
npx refactor-ts --help
npx refactor-ts rename-symbol <old> <new>
npx refactor-ts move-file <src> <dest>
```

## Project Structure

- `src/index.ts` - CLI entry point with argument parsing
- `dist/` - Compiled JavaScript output (generated)

## Architecture

Uses Node.js built-in `parseArgs` for argument parsing. Commands are dispatched from the main entry point. Each refactoring operation should be implemented as a separate module in `src/`.
