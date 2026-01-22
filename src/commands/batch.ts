import * as readline from "node:readline";
import { Project } from "ts-morph";
import type { BatchOperation, BatchOperationResult, BatchResult, Result } from "../types.js";
import { moveFileWithProject } from "./move-file.js";
import { moveSymbolWithProject } from "./move-symbol.js";
import { moveDirectoryWithProject } from "./move-directory.js";

export interface BatchOptions {
  dryRun?: boolean;
}

function parseOperation(line: string, index: number): BatchOperation | { error: string } {
  try {
    const parsed = JSON.parse(line);

    if (!parsed.op) {
      return { error: `Operation at line ${index + 1} missing 'op' field` };
    }

    switch (parsed.op) {
      case "move-file":
        if (!parsed.src || !parsed.dest) {
          return { error: `move-file operation at line ${index + 1} requires 'src' and 'dest' fields` };
        }
        return { op: "move-file", src: parsed.src, dest: parsed.dest };

      case "move-symbol":
        if (!parsed.file || !parsed.symbol || !parsed.dest) {
          return { error: `move-symbol operation at line ${index + 1} requires 'file', 'symbol', and 'dest' fields` };
        }
        return { op: "move-symbol", file: parsed.file, symbol: parsed.symbol, dest: parsed.dest };

      case "move-directory":
        if (!parsed.src || !parsed.dest) {
          return { error: `move-directory operation at line ${index + 1} requires 'src' and 'dest' fields` };
        }
        return { op: "move-directory", src: parsed.src, dest: parsed.dest };

      default:
        return { error: `Unknown operation '${parsed.op}' at line ${index + 1}` };
    }
  } catch {
    return { error: `Invalid JSON at line ${index + 1}: ${line}` };
  }
}

async function executeOperation(
  project: Project,
  operation: BatchOperation
): Promise<Result> {
  switch (operation.op) {
    case "move-file":
      return moveFileWithProject(project, operation.src, operation.dest, { save: false });

    case "move-symbol":
      return moveSymbolWithProject(project, operation.file, operation.symbol, operation.dest, { save: false });

    case "move-directory":
      return moveDirectoryWithProject(project, operation.src, operation.dest, { save: false });
  }
}

async function readOperationsFromStdin(): Promise<string[]> {
  return new Promise((resolve) => {
    const lines: string[] = [];
    const rl = readline.createInterface({
      input: process.stdin,
      crlfDelay: Infinity,
    });

    rl.on("line", (line) => {
      const trimmed = line.trim();
      if (trimmed) {
        lines.push(trimmed);
      }
    });

    rl.on("close", () => {
      resolve(lines);
    });
  });
}

export async function batch(options: BatchOptions = {}): Promise<BatchResult> {
  const { dryRun = false } = options;

  const lines = await readOperationsFromStdin();

  if (lines.length === 0) {
    return {
      success: true,
      operations: [],
      summary: {
        total: 0,
        succeeded: 0,
        failed: 0,
        filesModified: [],
      },
    };
  }

  // Parse all operations first
  const operations: (BatchOperation | { error: string })[] = lines.map(
    (line, index) => parseOperation(line, index)
  );

  // Create single shared project
  const project = new Project();
  project.addSourceFilesAtPaths("**/*.{ts,tsx}");

  const results: BatchOperationResult[] = [];
  const allFilesModified = new Set<string>();

  // Execute operations sequentially
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];

    if ("error" in op) {
      results.push({
        index: i,
        operation: { op: "move-file", src: "", dest: "" }, // placeholder
        result: {
          success: false,
          filesModified: [],
          error: op.error,
        },
      });
      continue;
    }

    const result = await executeOperation(project, op);
    results.push({
      index: i,
      operation: op,
      result,
    });

    if (result.success) {
      for (const file of result.filesModified) {
        allFilesModified.add(file);
      }
    }
  }

  // Save all changes at once (unless dry-run)
  if (!dryRun) {
    await project.save();
  }

  const succeeded = results.filter((r) => r.result.success).length;
  const failed = results.length - succeeded;

  return {
    success: failed === 0,
    operations: results,
    summary: {
      total: results.length,
      succeeded,
      failed,
      filesModified: Array.from(allFilesModified),
    },
  };
}
