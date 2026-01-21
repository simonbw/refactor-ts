#!/usr/bin/env node

import { parseArgs } from "node:util";
import { moveDirectory } from "./commands/move-directory.js";
import { moveFile } from "./commands/move-file.js";
import { moveSymbol } from "./commands/move-symbol.js";
import type { Result } from "./types.js";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: {
      type: "boolean",
      short: "h",
    },
    version: {
      type: "boolean",
      short: "v",
    },
  },
});

function printHelp() {
  console.log(`refactor-ts - CLI tool for code refactoring operations

Usage: refactor-ts <command> [options]

Commands:
  move-symbol <file> <symbol> <dest>   Move or rename a symbol
  move-file <source> <destination>     Move or rename a file and update imports
  move-directory <source> <dest>       Move or rename a directory and update imports

Options:
  -h, --help      Show this help message
  -v, --version   Show version number

Examples:
  refactor-ts move-symbol src/utils.ts calcTotal computeTotal   # rename symbol
  refactor-ts move-symbol src/utils.ts calcTotal src/math.ts    # move to file
  refactor-ts move-file src/utils.ts src/helpers/utils.ts       # move file
  refactor-ts move-directory src/utils src/helpers              # move directory
`);
}

function printVersion() {
  console.log("refactor-ts v0.1.0");
}

function output(result: Result) {
  console.log(JSON.stringify(result));
}

function error(message: string): Result {
  return { success: false, filesModified: [], error: message };
}

async function main() {
  if (values.help) {
    printHelp();
    process.exit(0);
  }

  if (values.version) {
    printVersion();
    process.exit(0);
  }

  const [command, ...args] = positionals;

  switch (command) {
    case "move-symbol": {
      const [file, symbol, destination] = args;
      if (!file || !symbol || !destination) {
        output(error("Usage: move-symbol <file> <symbol> <destination>"));
        process.exit(1);
      }
      output(await moveSymbol(file, symbol, destination));
      break;
    }
    case "move-file": {
      const [source, destination] = args;
      if (!source || !destination) {
        output(error("Usage: move-file <source> <destination>"));
        process.exit(1);
      }
      output(await moveFile(source, destination));
      break;
    }
    case "move-directory": {
      const [source, destination] = args;
      if (!source || !destination) {
        output(error("Usage: move-directory <source> <destination>"));
        process.exit(1);
      }
      output(await moveDirectory(source, destination));
      break;
    }
    case undefined:
      printHelp();
      break;
    default:
      output(error(`Unknown command: ${command}`));
      process.exit(1);
  }
}

main();
