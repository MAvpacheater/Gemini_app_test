
import React, { useState, useMemo, useCallback } from 'react';
import { FileTabs } from './components/FileTabs';
import { CodeEditor } from './components/CodeEditor';
import { AnalysisResult } from './components/AnalysisResult';
import { SparklesIcon } from './components/icons';
import { analyzeCode } from './services/geminiService';
import { CodeFile, AnalysisReport } from './types';

const App: React.FC = () => {
  const createNewFile = (index: number): CodeFile => ({
    id: `file_${Date.now()}_${index}`,
    name: `script${index}.js`,
    content: '',
  });

  const [files, setFiles] = useState<CodeFile[]>([createNewFile(1)]);
  const [activeFileId, setActiveFileId] = useState<string>(files[0].id);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeFile = useMemo(() => files.find(f => f.id === activeFileId), [files, activeFileId]);

  const handleAddFile = () => {
    const newFile = createNewFile(files.length + 1);
    setFiles([...files, newFile]);
    setActiveFileId(newFile.id);
  };

  const handleRemoveFile = (id: string) => {
    const newFiles = files.filter(f => f.id !== id);
    if (newFiles.length === 0) {
      const newFile = createNewFile(1);
      setFiles([newFile]);
      setActiveFileId(newFile.id);
    } else {
      setFiles(newFiles);
      if (activeFileId === id) {
        setActiveFileId(newFiles[0].id);
      }
    }
  };

  const handleSelectFile = (id: string) => {
    setActiveFileId(id);
  };

  const handleCodeChange = (content: string) => {
    setFiles(files.map(f => f.id === activeFileId ? { ...f, content } : f));
  };

  const handleFileNameChange = (id: string, newName: string) => {
    setFiles(files.map(f => (f.id === id ? { ...f, name: newName } : f)));
  };

  const handleAnalyze = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAnalysisReport(null);
    try {
      const report = await analyzeCode(files);
      setAnalysisReport(report);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [files]);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 text-white">
      <header className="flex-shrink-0 p-3 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-200">Аналізатор коду JS Pro</h1>
        <button
          onClick={handleAnalyze}
          disabled={isLoading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed transition-colors duration-200 font-semibold"
        >
          <SparklesIcon className="h-5 w-5 mr-2" />
          {isLoading ? 'Аналізую...' : 'Аналізувати код'}
        </button>
      </header>
      <main className="flex-grow flex h-full min-h-0">
        <div className="w-1/2 flex flex-col border-r border-gray-700">
          <FileTabs
            files={files}
            activeFileId={activeFileId}
            onAddFile={handleAddFile}
            onSelectFile={handleSelectFile}
            onRemoveFile={handleRemoveFile}
            onRenameFile={handleFileNameChange}
          />
          <div className="flex-grow h-full min-h-0">
            {activeFile && (
              <CodeEditor
                content={activeFile.content}
                onChange={handleCodeChange}
              />
            )}
          </div>
        </div>
        <div className="w-1/2">
          <AnalysisResult report={analysisReport} isLoading={isLoading} error={error} />
        </div>
      </main>
    </div>
  );
};

export default App;
