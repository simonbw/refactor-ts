import path from "node:path";
import { Project } from "ts-morph";
import type { Result } from "../types.js";

export interface MoveFileOptions {
  save?: boolean;
}

export async function moveFileWithProject(
  project: Project,
  source: string,
  destination: string,
  options: MoveFileOptions = {}
): Promise<Result> {
  const { save = true } = options;

  try {
    const cwd = process.cwd();
    const absoluteSource = path.resolve(cwd, source);
    const absoluteDestination = path.resolve(cwd, destination);

    const sourceFile = project.getSourceFile(absoluteSource);
    if (!sourceFile) {
      return {
        success: false,
        filesModified: [],
        error: `File not found: ${source}`,
      };
    }

    sourceFile.move(absoluteDestination);

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

export async function moveFile(
  source: string,
  destination: string
): Promise<Result> {
  const project = new Project();
  project.addSourceFilesAtPaths("**/*.{ts,tsx}");
  return moveFileWithProject(project, source, destination, { save: true });
}
