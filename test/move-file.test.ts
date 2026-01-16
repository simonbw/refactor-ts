import { describe, test, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { cp, rm, readFile, mkdir, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { moveFile } from "../src/commands/move-file.ts";

const FIXTURES_DIR = new URL("./fixtures/simple-project", import.meta.url)
  .pathname;

describe("move-file", () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = join(tmpdir(), `refactor-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
    await cp(FIXTURES_DIR, tempDir, { recursive: true });
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(tempDir, { recursive: true, force: true });
  });

  test("moves a file to a new location", async () => {
    const result = await moveFile("src/utils.ts", "src/helpers/utils.ts");

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);

    // Verify the file was moved
    await assert.doesNotReject(access(join(tempDir, "src/helpers/utils.ts")));
    await assert.rejects(access(join(tempDir, "src/utils.ts")));
  });

  test("updates imports in files that reference the moved file", async () => {
    await moveFile("src/utils.ts", "src/helpers/utils.ts");

    const indexContent = await readFile(join(tempDir, "src/index.ts"), "utf-8");
    const otherContent = await readFile(join(tempDir, "src/other.ts"), "utf-8");

    // Imports should be updated to point to new location
    assert.ok(
      indexContent.includes("./helpers/utils"),
      `Expected index.ts to import from ./helpers/utils, got: ${indexContent}`
    );
    assert.ok(
      otherContent.includes("./helpers/utils"),
      `Expected other.ts to import from ./helpers/utils, got: ${otherContent}`
    );
  });

  test("reports all modified files", async () => {
    const result = await moveFile("src/utils.ts", "src/helpers/utils.ts");

    assert.strictEqual(result.success, true);
    // Should include the moved file and files with updated imports
    assert.ok(result.filesModified.length >= 1);
  });

  test("returns error when source file does not exist", async () => {
    const result = await moveFile("src/nonexistent.ts", "src/somewhere.ts");

    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes("not found"));
    assert.deepStrictEqual(result.filesModified, []);
  });

  test("can rename a file in the same directory", async () => {
    const result = await moveFile("src/utils.ts", "src/utilities.ts");

    assert.strictEqual(result.success, true);

    await assert.doesNotReject(access(join(tempDir, "src/utilities.ts")));
    await assert.rejects(access(join(tempDir, "src/utils.ts")));

    const indexContent = await readFile(join(tempDir, "src/index.ts"), "utf-8");
    assert.ok(
      indexContent.includes("./utilities"),
      `Expected import to be updated to ./utilities, got: ${indexContent}`
    );
  });
});
