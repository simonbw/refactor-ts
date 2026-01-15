#!/usr/bin/env node

import { parseArgs } from "node:util";

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
  rename-symbol <old> <new>   Rename a symbol across the codebase
  move-file <src> <dest>      Move a file and update imports

Options:
  -h, --help      Show this help message
  -v, --version   Show version number
`);
}

function printVersion() {
  console.log("refactor-ts v0.1.0");
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
    case "rename-symbol":
      console.log("rename-symbol: not yet implemented");
      break;
    case "move-file":
      console.log("move-file: not yet implemented");
      break;
    case undefined:
      printHelp();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main();
