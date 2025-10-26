// FIX: Add missing React and ReactDOM imports to enable JSX and DOM rendering.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- From types.ts ---
interface CodeFile {
  id: string;
  name: string;
  content: string;
}

interface AnalysisError {
  line: number;
  errorType: string;
  message: string;
  suggestion: string;
}

interface FileAnalysis {
  fileName: string;
  errors: AnalysisError[];
  correctedCode?: string;
}

interface AnalysisReport {
  summary: string;
  files: FileAnalysis[];
}

// --- From components/icons.tsx ---
const PlusIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

const SparklesIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
  </svg>
);

const FileCodeIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const CodeBracketIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 15" />
    </svg>
);

const KeyIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
    </svg>
);

// --- From services/geminiService.ts ---
const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "Короткий загальний підсумок якості коду, що визначає найкритичніші проблеми, знайдені у всіх файлах."
    },
    files: {
      type: Type.ARRAY,
      description: "Масив об'єктів, де кожен об'єкт представляє аналіз одного файлу.",
      items: {
        type: Type.OBJECT,
        properties: {
          fileName: {
            type: Type.STRING,
            description: "Назва аналізованого файлу."
          },
          errors: {
            type: Type.ARRAY,
            description: "Список помилок або потенційних проблем, знайдених у цьому файлі.",
            items: {
              type: Type.OBJECT,
              properties: {
                line: {
                  type: Type.INTEGER,
                  description: "Номер рядка, де виникає проблема."
                },
                errorType: {
                  type: Type.STRING,
                  description: "Тип помилки (наприклад, 'SyntaxError', 'LogicError', 'StyleViolation', 'ImportError')."
                },
                message: {
                  type: Type.STRING,
                  description: "Чіткий і стислий опис помилки."
                },
                suggestion: {
                  type: Type.STRING,
                  description: "Конкретна пропозиція або фрагмент коду для виправлення проблеми."
                },
              },
              required: ['line', 'errorType', 'message', 'suggestion']
            }
          },
          correctedCode: {
              type: Type.STRING,
              description: "Повний вміст файлу з усіма виправленими помилками. Якщо помилок не знайдено, це має бути оригінальний код."
          }
        },
        required: ['fileName', 'errors', 'correctedCode']
      }
    }
  },
  required: ['summary', 'files']
};

// FIX: Update analyzeCode to use process.env.API_KEY and remove apiKey parameter.
const analyzeCode = async (files: CodeFile[]): Promise<AnalysisReport> => {
  if (files.length === 0 || files.every(f => f.content.trim() === '')) {
    throw new Error("Немає коду для аналізу.");
  }

  // FIX: Initialize GoogleGenAI with API key from environment variables.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const formattedFiles = files.map(file => `
// FILE: ${file.name}
// --- START OF CODE ---
${file.content}
// --- END OF CODE ---
`).join('\n\n');

  const prompt = `
    Ти експерт з рецензування коду JavaScript. Проаналізуй наступні файли JavaScript, розглядаючи їх як єдиний проєкт.

    Твоє завдання — виявити:
    1.  Синтаксичні помилки, потенційні помилки під час виконання, логічні помилки, проблеми з продуктивністю та відхилення від найкращих практик у кожному файлі.
    2.  Проблеми з модулями та імпортами між файлами. Зверни особливу увагу на:
        - Імпорт з файлу, якого немає серед наданих.
        - Імпорт іменованої сутності (змінної, функції, класу), яка не експортується з цільового файлу.
        - Невідповідність між іменованими та дефолтними імпортами/експортами.

    Надай детальний звіт у форматі JSON. Звіт повинен містити:
    - Загальний підсумок якості коду.
    - Розбивку проблем по кожному файлу.
    - Для кожної проблеми: назву файлу, номер рядка, тип помилки (наприклад, 'ImportError' для проблем з імпортами), чітке повідомлення та конкретну пропозицію щодо виправлення.
    - Для кожного файлу: повний, виправлений код у полі 'correctedCode'. Якщо у файлі немає помилок, поверни оригінальний код.
    - Якщо у файлі немає помилок, поверни порожній масив для його властивості 'errors'.
    
    ВАЖЛИВО: Вся відповідь у форматі JSON, включаючи всі описи, повідомлення та пропозиції, має бути українською мовою.

    Ось файли для аналізу:
    ${formattedFiles}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      },
    });

    const jsonText = response.text.trim();
    const result: AnalysisReport = JSON.parse(jsonText);
    return result;

  } catch (error) {
    console.error("Error analyzing code with Gemini API:", error);
    throw new Error("Не вдалося отримати аналіз від сервера. Перевірте ваш API ключ та з'єднання з мережею.");
  }
};


// --- From components/ApiKeyModal.tsx ---
// FIX: Removed ApiKeyModal component to adhere to the guideline of using environment variables for API keys.


// --- From components/AnalysisResult.tsx ---
const WelcomeMessage = () => (
  <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
    <SparklesIcon className="h-16 w-16 mb-4" />
    <h2 className="text-2xl font-bold text-gray-300">Ласкаво просимо до Аналізатора коду JS Pro</h2>
    <p className="mt-2 max-w-md">
      Додайте файли, напишіть код і натисніть "Аналізувати". Gemini проведе експертну перевірку, включаючи аналіз імпортів між файлами.
    </p>
  </div>
);

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center h-full text-gray-400">
    <svg className="animate-spin h-10 w-10 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <p className="text-lg">Аналізуємо ваш код...</p>
    <p className="text-sm text-gray-500 mt-1">Це може зайняти деякий час.</p>
  </div>
);

const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center h-full text-center text-red-400 p-4">
        <h3 className="text-xl font-semibold mb-2">Помилка аналізу</h3>
        <p className="bg-red-900/50 p-3 rounded-md text-sm">{message}</p>
    </div>
);


const ReportDisplay: React.FC<{ report: AnalysisReport }> = ({ report }) => (
    <div className="p-6">
        <h2 className="text-2xl font-bold text-blue-300 mb-4 border-b border-gray-700 pb-2">Звіт про аналіз</h2>
        <div className="bg-gray-800/50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold text-gray-200 mb-2">Підсумок</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{report.summary}</p>
        </div>
        {report.files.map((file, index) => (
            <FileResult key={index} file={file} />
        ))}
    </div>
);

const FileResult: React.FC<{ file: FileAnalysis }> = ({ file }) => {
    const [isCodeVisible, setIsCodeVisible] = React.useState(false);

    return (
      <div className="mb-6">
        <div className="flex items-center text-xl font-semibold text-gray-100 mb-3">
            <FileCodeIcon className="h-5 w-5 mr-2 text-gray-400"/>
            <h3>{file.fileName}</h3>
        </div>
        {file.errors.length > 0 ? (
          <div className="space-y-4">
            {file.errors.map((err, index) => (
              <div key={index} className="bg-gray-800 border-l-4 border-yellow-500 rounded-r-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-mono text-sm text-red-400">
                    Рядок {err.line}: <span className="font-semibold text-yellow-400">{err.errorType}</span>
                  </p>
                </div>
                <p className="text-gray-300 text-sm mb-2">{err.message}</p>
                <div className="mt-2 pt-2 border-t border-gray-700">
                    <p className="text-xs text-gray-400 mb-1 font-semibold">Пропозиція:</p>
                    <p className="font-mono text-sm text-green-400 bg-gray-900 p-2 rounded">{err.suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-800/50 border-l-4 border-green-500 rounded-r-lg p-4">
            <p className="text-green-400">У цьому файлі проблем не знайдено. Чудова робота!</p>
          </div>
        )}

        {file.correctedCode && (
            <div className="mt-4">
                <button
                    onClick={() => setIsCodeVisible(!isCodeVisible)}
                    className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium px-3 py-1.5 rounded-md hover:bg-blue-500/10"
                >
                    <CodeBracketIcon className="h-5 w-5" />
                    {isCodeVisible ? 'Сховати виправлений код' : 'Показати виправлений код'}
                </button>
                {isCodeVisible && (
                    <div className="mt-2 bg-gray-900 p-3 rounded-md border border-gray-700 max-h-96 overflow-y-auto">
                        <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                            <code>{file.correctedCode}</code>
                        </pre>
                    </div>
                )}
            </div>
        )}
      </div>
    );
};

const AnalysisResult: React.FC<any> = ({ report, isLoading, error }) => {
  return (
    <div className="h-full w-full bg-gray-800/30 overflow-y-auto">
      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorDisplay message={error} />
      ) : report ? (
        <ReportDisplay report={report} />
      ) : (
        <WelcomeMessage />
      )}
    </div>
  );
};


// --- From components/CodeEditor.tsx ---
const CodeEditor: React.FC<any> = ({ content, onChange }) => {
  return (
    <div className="h-full w-full bg-gray-900">
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Вставте ваш JavaScript код сюди..."
        className="w-full h-full bg-transparent text-gray-300 p-4 font-mono text-sm resize-none focus:outline-none leading-relaxed"
        spellCheck="false"
      />
    </div>
  );
};


// --- From components/FileTabs.tsx ---
const FileTabs: React.FC<any> = ({
  files,
  activeFileId,
  onAddFile,
  onSelectFile,
  onRemoveFile,
  onRenameFile,
}) => {
  const [editingTabId, setEditingTabId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingTabId]);

  const handleDoubleClick = (file: CodeFile) => {
    setEditingTabId(file.id);
    setEditingName(file.name);
  };

  const handleRename = () => {
    if (editingTabId && editingName.trim()) {
      onRenameFile(editingTabId, editingName.trim());
    }
    setEditingTabId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
    }
  };

  return (
    <div className="flex items-center border-b border-gray-700 bg-gray-800/50">
      <div className="flex-grow flex items-center overflow-x-auto">
        {files.map((file) => (
          <div
            key={file.id}
            onClick={() => onSelectFile(file.id)}
            onDoubleClick={() => handleDoubleClick(file)}
            className={`flex items-center justify-between px-4 py-2 border-r border-gray-700 cursor-pointer transition-colors duration-200 whitespace-nowrap ${
              activeFileId === file.id
                ? 'bg-blue-600/30 text-blue-300 border-b-2 border-blue-400'
                : 'hover:bg-gray-700/50'
            }`}
          >
            {editingTabId === file.id ? (
              <input
                ref={inputRef}
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={handleKeyDown}
                className="bg-gray-900 text-white outline-none p-0 m-0 text-sm w-24"
              />
            ) : (
              <span className="text-sm mr-2">{file.name}</span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFile(file.id);
              }}
              className="p-0.5 rounded-full hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
            >
              <XIcon className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={onAddFile}
        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
      >
        <PlusIcon className="h-5 w-5" />
      </button>
    </div>
  );
};


// --- From App.tsx ---
const App: React.FC = () => {
  const createNewFile = (index: number): CodeFile => ({
    id: `file_${Date.now()}_${index}`,
    name: `script${index}.js`,
    content: '',
  });

  const [files, setFiles] = React.useState<CodeFile[]>([createNewFile(1)]);
  const [activeFileId, setActiveFileId] = React.useState<string>(files[0].id);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [analysisReport, setAnalysisReport] = React.useState<AnalysisReport | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  // FIX: Removed state for API key and modal to use environment variables.

  const activeFile = React.useMemo(() => files.find(f => f.id === activeFileId), [files, activeFileId]);

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

  // FIX: Updated handleAnalyze to remove API key logic.
  const handleAnalyze = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAnalysisReport(null);
    try {
      // FIX: Call analyzeCode without passing the API key.
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

  // FIX: Removed handleSaveApiKey function.

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 text-white">
      {/* FIX: Removed ApiKeyModal component. */}
      <header className="flex-shrink-0 p-3 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-200">Аналізатор коду JS Pro</h1>
        <div className="flex items-center gap-4">
          {/* FIX: Removed button to change API key. */}
          <button
            onClick={handleAnalyze}
            // FIX: The button is disabled only when loading.
            disabled={isLoading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:bg-gray-600/50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-200 font-semibold"
          >
            <SparklesIcon className="h-5 w-5 mr-2" />
            {isLoading ? 'Аналізую...' : 'Аналізувати код'}
          </button>
        </div>
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


// --- Original index.tsx render logic ---
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
