import path from "node:path";
import { Project, type SourceFile, type ExportedDeclarations } from "ts-morph";
import type { Result } from "../types.js";

function isFilePath(str: string): boolean {
  return str.endsWith(".ts") || str.endsWith(".tsx");
}

function findExportedSymbol(
  sourceFile: SourceFile,
  symbolName: string
): ExportedDeclarations | undefined {
  const exportedDeclarations = sourceFile.getExportedDeclarations();
  const declarations = exportedDeclarations.get(symbolName);
  return declarations?.[0];
}

async function renameSymbol(
  project: Project,
  sourceFile: SourceFile,
  symbolName: string,
  newName: string
): Promise<Result> {
  const declaration = findExportedSymbol(sourceFile, symbolName);
  if (!declaration) {
    return {
      success: false,
      filesModified: [],
      error: `Symbol '${symbolName}' not found in ${sourceFile.getFilePath()}`,
    };
  }

  // Find the identifier to rename
  const namedNode = declaration.asKind(declaration.getKind());
  if (!namedNode || !("rename" in namedNode)) {
    // Try to find a name node we can rename
    const nameNode = declaration.getFirstDescendantByKind(80); // SyntaxKind.Identifier
    if (nameNode && nameNode.getText() === symbolName) {
      nameNode.rename(newName);
    } else {
      return {
        success: false,
        filesModified: [],
        error: `Cannot rename symbol '${symbolName}'`,
      };
    }
  } else {
    (namedNode as { rename(name: string): void }).rename(newName);
  }

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
}

async function moveSymbolToFile(
  project: Project,
  sourceFile: SourceFile,
  symbolName: string,
  destPath: string
): Promise<Result> {
  const declaration = findExportedSymbol(sourceFile, symbolName);
  if (!declaration) {
    return {
      success: false,
      filesModified: [],
      error: `Symbol '${symbolName}' not found in ${sourceFile.getFilePath()}`,
    };
  }

  const cwd = process.cwd();
  const absoluteDest = path.resolve(cwd, destPath);

  // Get or create destination file
  let destFile = project.getSourceFile(absoluteDest);
  if (!destFile) {
    destFile = project.createSourceFile(absoluteDest, "");
  }

  // Get the full text of the declaration
  const declarationText = declaration.getFullText();

  // Add the declaration to the destination file
  destFile.addStatements(declarationText);

  // Remove from source file - need to handle different declaration types
  const parent = declaration.getParent();
  if (parent && "remove" in parent) {
    (parent as { remove(): void }).remove();
  } else if ("remove" in declaration) {
    (declaration as { remove(): void }).remove();
  }

  // Update imports in all files that were importing from source to also import from dest
  const sourceFilePath = sourceFile.getFilePath();
  const destFilePath = destFile.getFilePath();

  for (const sf of project.getSourceFiles()) {
    if (sf === sourceFile || sf === destFile) continue;

    for (const importDecl of sf.getImportDeclarations()) {
      const moduleSpecifier = importDecl.getModuleSpecifierSourceFile();
      if (moduleSpecifier?.getFilePath() === sourceFilePath) {
        const namedImports = importDecl.getNamedImports();
        const symbolImport = namedImports.find(
          (ni) => ni.getName() === symbolName
        );

        if (symbolImport) {
          // Remove this import from the current import declaration
          symbolImport.remove();

          // Add new import for the moved symbol
          const relPath = path.relative(path.dirname(sf.getFilePath()), destFilePath);
          const importPath = relPath.startsWith(".") ? relPath : "./" + relPath;
          const importPathWithoutExt = importPath.replace(/\.tsx?$/, ".js");

          sf.addImportDeclaration({
            moduleSpecifier: importPathWithoutExt,
            namedImports: [symbolName],
          });

          // If no named imports left, remove the whole import declaration
          if (importDecl.getNamedImports().length === 0) {
            importDecl.remove();
          }
        }
      }
    }
  }

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
}

export async function moveSymbol(
  file: string,
  symbol: string,
  destination: string
): Promise<Result> {
  try {
    const cwd = process.cwd();
    const absoluteSource = path.resolve(cwd, file);

    const project = new Project();
    project.addSourceFilesAtPaths("**/*.{ts,tsx}");

    const sourceFile = project.getSourceFile(absoluteSource);
    if (!sourceFile) {
      return {
        success: false,
        filesModified: [],
        error: `File not found: ${file}`,
      };
    }

    if (isFilePath(destination)) {
      return moveSymbolToFile(project, sourceFile, symbol, destination);
    } else {
      return renameSymbol(project, sourceFile, symbol, destination);
    }
  } catch (err) {
    return {
      success: false,
      filesModified: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
