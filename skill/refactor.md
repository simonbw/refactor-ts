---
description: Use this skill when you need to rename or move TypeScript symbols (functions, classes, variables, types) or move/rename TypeScript files while automatically updating all imports
---

# refactor-ts

A CLI tool for TypeScript refactoring that updates all references automatically.

## Commands

### Move/Rename a Symbol
`npx refactor-ts move-symbol <file> <symbol> <destination>`

- To **rename** a symbol in place: destination is the new name
- To **move** a symbol to another file: destination is a file path

### Move/Rename a File
`npx refactor-ts move-file <source> <destination>`

Moves or renames a file and updates all import statements across the codebase.

## Output
All commands output JSON:
```json
{
  "success": true,
  "filesModified": ["src/foo.ts", "src/bar.ts"],
  "error": null
}
```

## Examples
```bash
# Rename function
npx refactor-ts move-symbol src/utils.ts calculateTotal computeTotal

# Move function to different file
npx refactor-ts move-symbol src/utils.ts calculateTotal src/math.ts

# Move/rename a file
npx refactor-ts move-file src/utils.ts src/helpers/utils.ts
```
