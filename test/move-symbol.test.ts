import { describe, test, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { cp, rm, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { moveSymbol } from "../src/commands/move-symbol.ts";

const FIXTURES_DIR = new URL("./fixtures/simple-project", import.meta.url)
  .pathname;

describe("move-symbol", () => {
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

  describe("rename symbol", () => {
    test("renames a function in place", async () => {
      const result = await moveSymbol("src/utils.ts", "add", "sum");

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.error, null);

      const utilsContent = await readFile(join(tempDir, "src/utils.ts"), "utf-8");
      assert.ok(
        utilsContent.includes("export function sum"),
        `Expected function to be renamed to sum, got: ${utilsContent}`
      );
      assert.ok(
        !utilsContent.includes("export function add"),
        "Original function name should not exist"
      );
    });

    test("updates references in other files when renaming", async () => {
      await moveSymbol("src/utils.ts", "add", "sum");

      const indexContent = await readFile(join(tempDir, "src/index.ts"), "utf-8");
      const otherContent = await readFile(join(tempDir, "src/other.ts"), "utf-8");

      assert.ok(
        indexContent.includes("sum"),
        `Expected index.ts to use renamed symbol, got: ${indexContent}`
      );
      assert.ok(
        otherContent.includes("sum"),
        `Expected other.ts to use renamed symbol, got: ${otherContent}`
      );
    });

    test("renames a const export", async () => {
      const result = await moveSymbol("src/utils.ts", "PI", "TAU");

      assert.strictEqual(result.success, true);

      const utilsContent = await readFile(join(tempDir, "src/utils.ts"), "utf-8");
      assert.ok(
        utilsContent.includes("export const TAU"),
        `Expected const to be renamed, got: ${utilsContent}`
      );
    });

    test("returns error when symbol does not exist", async () => {
      const result = await moveSymbol("src/utils.ts", "nonexistent", "newName");

      assert.strictEqual(result.success, false);
      assert.ok(result.error?.includes("not found"));
      assert.deepStrictEqual(result.filesModified, []);
    });
  });

  describe("move symbol to file", () => {
    test("moves a symbol to a new file", async () => {
      const result = await moveSymbol("src/utils.ts", "multiply", "src/math.ts");

      assert.strictEqual(result.success, true);

      // Symbol should exist in destination
      const mathContent = await readFile(join(tempDir, "src/math.ts"), "utf-8");
      assert.ok(
        mathContent.includes("multiply"),
        `Expected multiply to be in math.ts, got: ${mathContent}`
      );

      // Symbol should be removed from source
      const utilsContent = await readFile(join(tempDir, "src/utils.ts"), "utf-8");
      assert.ok(
        !utilsContent.includes("export function multiply"),
        `multiply should be removed from utils.ts, got: ${utilsContent}`
      );
    });

    test("moves a symbol to an existing file", async () => {
      const result = await moveSymbol("src/utils.ts", "PI", "src/other.ts");

      assert.strictEqual(result.success, true);

      const otherContent = await readFile(join(tempDir, "src/other.ts"), "utf-8");
      assert.ok(
        otherContent.includes("PI") && otherContent.includes("3.14159"),
        `Expected PI to be moved to other.ts, got: ${otherContent}`
      );
    });

    test("updates imports when moving symbol", async () => {
      await moveSymbol("src/utils.ts", "add", "src/math.ts");

      const indexContent = await readFile(join(tempDir, "src/index.ts"), "utf-8");

      // Should now import add from math.ts
      assert.ok(
        indexContent.includes("./math"),
        `Expected index.ts to import from math.ts, got: ${indexContent}`
      );
    });

    test("returns error when source file does not exist", async () => {
      const result = await moveSymbol(
        "src/nonexistent.ts",
        "foo",
        "src/bar.ts"
      );

      assert.strictEqual(result.success, false);
      assert.ok(result.error?.includes("not found"));
    });
  });
});
