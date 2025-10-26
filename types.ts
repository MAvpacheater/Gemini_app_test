
export interface CodeFile {
  id: string;
  name: string;
  content: string;
}

export interface AnalysisError {
  line: number;
  errorType: string;
  message: string;
  suggestion: string;
}

export interface FileAnalysis {
  fileName: string;
  errors: AnalysisError[];
  correctedCode?: string;
}

export interface AnalysisReport {
  summary: string;
  files: FileAnalysis[];
}
