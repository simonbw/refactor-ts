import { describe, test, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { cp, rm, readFile, mkdir, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { moveDirectory } from "../src/commands/move-directory.ts";

const FIXTURES_DIR = new URL("./fixtures/directory-project", import.meta.url)
  .pathname;

describe("move-directory", () => {
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

  test("moves a directory to a new location", async () => {
    const result = await moveDirectory("src/lib", "src/helpers");

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);

    // Verify the directory was moved
    await assert.doesNotReject(access(join(tempDir, "src/helpers/utils.ts")));
    await assert.doesNotReject(access(join(tempDir, "src/helpers/format.ts")));
    await assert.rejects(access(join(tempDir, "src/lib")));
  });

  test("updates imports in files that reference the moved directory", async () => {
    await moveDirectory("src/lib", "src/helpers");

    const mainContent = await readFile(join(tempDir, "src/main.ts"), "utf-8");

    // Imports should be updated to point to new location
    assert.ok(
      mainContent.includes("./helpers/utils"),
      `Expected main.ts to import from ./helpers/utils, got: ${mainContent}`
    );
    assert.ok(
      mainContent.includes("./helpers/format"),
      `Expected main.ts to import from ./helpers/format, got: ${mainContent}`
    );
  });

  test("reports all modified files", async () => {
    const result = await moveDirectory("src/lib", "src/helpers");

    assert.strictEqual(result.success, true);
    // Should include the moved files and files with updated imports
    assert.ok(result.filesModified.length >= 1);
  });

  test("returns error when source directory does not exist", async () => {
    const result = await moveDirectory("src/nonexistent", "src/somewhere");

    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes("not found"));
    assert.deepStrictEqual(result.filesModified, []);
  });
});
