import path from "node:path";
import { Project } from "ts-morph";
import type { Result } from "../types.js";

export async function moveDirectory(
  source: string,
  destination: string
): Promise<Result> {
  try {
    const cwd = process.cwd();
    const absoluteSource = path.resolve(cwd, source);
    const absoluteDestination = path.resolve(cwd, destination);

    const project = new Project();
    project.addSourceFilesAtPaths("**/*.{ts,tsx}");

    const directory = project.getDirectory(absoluteSource);
    if (!directory) {
      return {
        success: false,
        filesModified: [],
        error: `Directory not found: ${source}`,
      };
    }

    directory.move(absoluteDestination);

    const modifiedFiles = project
      .getSourceFiles()
      .filter((sf) => !sf.isSaved())
      .map((sf) => sf.getFilePath());

    await project.save();

    return {
      success: true,
      filesModified: modifiedFiles,
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      filesModified: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
