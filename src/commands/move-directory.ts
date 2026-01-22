import path from "node:path";
import { Project } from "ts-morph";
import type { Result } from "../types.js";

export interface MoveDirectoryOptions {
  save?: boolean;
}

export async function moveDirectoryWithProject(
  project: Project,
  source: string,
  destination: string,
  options: MoveDirectoryOptions = {}
): Promise<Result> {
  const { save = true } = options;

  try {
    const cwd = process.cwd();
    const absoluteSource = path.resolve(cwd, source);
    const absoluteDestination = path.resolve(cwd, destination);

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

    if (save) {
      await project.save();
    }

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

export async function moveDirectory(
  source: string,
  destination: string
): Promise<Result> {
  const project = new Project();
  project.addSourceFilesAtPaths("**/*.{ts,tsx}");
  return moveDirectoryWithProject(project, source, destination, { save: true });
}
