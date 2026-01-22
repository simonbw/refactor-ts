import { describe, test, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { cp, rm, readFile, mkdir, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const FIXTURES_DIR = new URL("./fixtures/simple-project", import.meta.url)
  .pathname;

// Path to the built CLI
const CLI_PATH = join(process.cwd(), "dist/index.js");

function runBatch(
  input: string,
  cwd: string,
  args: string[] = []
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn(
      "node",
      [CLI_PATH, "batch", ...args],
      { cwd }
    );

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 0 });
    });

    proc.stdin.write(input);
    proc.stdin.end();
  });
}

describe("batch", () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = join(
      tmpdir(),
      `refactor-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    await mkdir(tempDir, { recursive: true });
    await cp(FIXTURES_DIR, tempDir, { recursive: true });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(tempDir, { recursive: true, force: true });
  });

  test("executes multiple move-file operations", async () => {
    const input = [
      '{"op": "move-file", "src": "src/utils.ts", "dest": "src/helpers/utils.ts"}',
    ].join("\n");

    const { stdout, exitCode } = await runBatch(input, tempDir);
    const result = JSON.parse(stdout);

    assert.strictEqual(exitCode, 0);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.summary.total, 1);
    assert.strictEqual(result.summary.succeeded, 1);
    assert.strictEqual(result.summary.failed, 0);

    // Verify the file was moved
    await assert.doesNotReject(access(join(tempDir, "src/helpers/utils.ts")));
    await assert.rejects(access(join(tempDir, "src/utils.ts")));
  });

  test("executes move-symbol operations", async () => {
    const input = [
      '{"op": "move-symbol", "file": "src/utils.ts", "symbol": "add", "dest": "sum"}',
    ].join("\n");

    const { stdout, exitCode } = await runBatch(input, tempDir);
    const result = JSON.parse(stdout);

    assert.strictEqual(exitCode, 0);
    assert.strictEqual(result.success, true);

    // Verify the symbol was renamed
    const content = await readFile(join(tempDir, "src/utils.ts"), "utf-8");
    assert.ok(
      content.includes("sum"),
      `Expected utils.ts to contain 'sum', got: ${content}`
    );
    assert.ok(
      !content.includes("function add"),
      `Expected utils.ts not to contain 'function add', got: ${content}`
    );
  });

  test("executes mixed operation types", async () => {
    const input = [
      '{"op": "move-symbol", "file": "src/utils.ts", "symbol": "multiply", "dest": "product"}',
      '{"op": "move-file", "src": "src/other.ts", "dest": "src/secondary.ts"}',
    ].join("\n");

    const { stdout, exitCode } = await runBatch(input, tempDir);
    const result = JSON.parse(stdout);

    assert.strictEqual(exitCode, 0);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.summary.total, 2);
    assert.strictEqual(result.summary.succeeded, 2);

    // Verify the symbol was renamed
    const utilsContent = await readFile(join(tempDir, "src/utils.ts"), "utf-8");
    assert.ok(utilsContent.includes("product"));

    // Verify the file was moved
    await assert.doesNotReject(access(join(tempDir, "src/secondary.ts")));
  });

  test("continues on error and reports all results", async () => {
    const input = [
      '{"op": "move-file", "src": "src/nonexistent.ts", "dest": "src/new.ts"}',
      '{"op": "move-file", "src": "src/utils.ts", "dest": "src/helpers/utils.ts"}',
    ].join("\n");

    const { stdout, exitCode } = await runBatch(input, tempDir);
    const result = JSON.parse(stdout);

    assert.strictEqual(exitCode, 1);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.summary.total, 2);
    assert.strictEqual(result.summary.failed, 1);
    assert.strictEqual(result.summary.succeeded, 1);

    // First operation should have failed
    assert.strictEqual(result.operations[0].result.success, false);
    assert.ok(result.operations[0].result.error.includes("not found"));

    // Second operation should have succeeded
    assert.strictEqual(result.operations[1].result.success, true);

    // Verify the successful move happened
    await assert.doesNotReject(access(join(tempDir, "src/helpers/utils.ts")));
  });

  test("dry-run mode does not save changes", async () => {
    const input = [
      '{"op": "move-file", "src": "src/utils.ts", "dest": "src/helpers/utils.ts"}',
    ].join("\n");

    const { stdout, exitCode } = await runBatch(input, tempDir, ["--dry-run"]);
    const result = JSON.parse(stdout);

    assert.strictEqual(exitCode, 0);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.summary.succeeded, 1);

    // File should NOT have been moved
    await assert.doesNotReject(access(join(tempDir, "src/utils.ts")));
    await assert.rejects(access(join(tempDir, "src/helpers/utils.ts")));
  });

  test("handles empty input", async () => {
    const { stdout, exitCode } = await runBatch("", tempDir);
    const result = JSON.parse(stdout);

    assert.strictEqual(exitCode, 0);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.summary.total, 0);
    assert.strictEqual(result.summary.succeeded, 0);
    assert.strictEqual(result.summary.failed, 0);
  });

  test("handles malformed JSON", async () => {
    const input = [
      '{"op": "move-file", "src": "src/utils.ts", "dest": "src/new.ts"}',
      "not valid json",
      '{"op": "move-file", "src": "src/other.ts", "dest": "src/another.ts"}',
    ].join("\n");

    const { stdout, exitCode } = await runBatch(input, tempDir);
    const result = JSON.parse(stdout);

    assert.strictEqual(exitCode, 1);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.summary.total, 3);
    assert.strictEqual(result.summary.failed, 1);
    assert.strictEqual(result.summary.succeeded, 2);

    // Malformed JSON should be reported
    assert.strictEqual(result.operations[1].result.success, false);
    assert.ok(result.operations[1].result.error.includes("Invalid JSON"));
  });

  test("handles missing required fields", async () => {
    const input = [
      '{"op": "move-file", "src": "src/utils.ts"}', // missing dest
      '{"op": "move-symbol", "file": "src/utils.ts"}', // missing symbol and dest
    ].join("\n");

    const { stdout, exitCode } = await runBatch(input, tempDir);
    const result = JSON.parse(stdout);

    assert.strictEqual(exitCode, 1);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.summary.failed, 2);

    assert.ok(result.operations[0].result.error.includes("requires"));
    assert.ok(result.operations[1].result.error.includes("requires"));
  });

  test("handles unknown operation type", async () => {
    const input = '{"op": "unknown-op", "src": "foo", "dest": "bar"}';

    const { stdout, exitCode } = await runBatch(input, tempDir);
    const result = JSON.parse(stdout);

    assert.strictEqual(exitCode, 1);
    assert.strictEqual(result.success, false);
    assert.ok(result.operations[0].result.error.includes("Unknown operation"));
  });

  test("later operations see changes from earlier ones", async () => {
    // First move a file, then move a symbol from the moved file
    const input = [
      '{"op": "move-file", "src": "src/utils.ts", "dest": "src/helpers/utils.ts"}',
      '{"op": "move-symbol", "file": "src/helpers/utils.ts", "symbol": "add", "dest": "sum"}',
    ].join("\n");

    const { stdout, exitCode } = await runBatch(input, tempDir);
    const result = JSON.parse(stdout);

    assert.strictEqual(exitCode, 0);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.summary.succeeded, 2);

    // Verify both operations succeeded
    await assert.doesNotReject(access(join(tempDir, "src/helpers/utils.ts")));
    const content = await readFile(
      join(tempDir, "src/helpers/utils.ts"),
      "utf-8"
    );
    assert.ok(
      content.includes("sum"),
      `Expected file to contain 'sum', got: ${content}`
    );
  });
});
