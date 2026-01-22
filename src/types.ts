export interface Result {
  success: boolean;
  filesModified: string[];
  error: string | null;
}

export type BatchOperation =
  | { op: "move-file"; src: string; dest: string }
  | { op: "move-symbol"; file: string; symbol: string; dest: string }
  | { op: "move-directory"; src: string; dest: string };

export interface BatchOperationResult {
  index: number;
  operation: BatchOperation;
  result: Result;
}

export interface BatchResult {
  success: boolean;
  operations: BatchOperationResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    filesModified: string[];
  };
}
