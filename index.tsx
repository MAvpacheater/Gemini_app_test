// FIX: Add missing React and ReactDOM imports to enable JSX and DOM rendering.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type, Chat } from "@google/genai";

// --- TYPES ---
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


// --- ICONS ---
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

const DocumentMagnifyingGlassIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z M10.5 7.5v6m3-3h-6" />
    </svg>
);

const KeyIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
    </svg>
);

const PaperAirplaneIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
    </svg>
);

const FileCodeIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

// --- GEMINI SERVICES & SCHEMAS ---

const JARVIS_SYSTEM_INSTRUCTION = "Ти — J.A.R.V.I.S., професійний програміст та дебагер. Твоя мета — створювати та аналізувати код найвищої якості. Суворо дотримуйся запиту користувача, не додаючи нічого від себе. Твої відповіді мають бути точними, ефективними та чистими.";

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: "Короткий загальний підсумок якості коду." },
    files: {
      type: Type.ARRAY,
      description: "Масив об'єктів, де кожен об'єкт представляє аналіз одного файлу.",
      items: {
        type: Type.OBJECT,
        properties: {
          fileName: { type: Type.STRING, description: "Назва аналізованого файлу." },
          errors: {
            type: Type.ARRAY,
            description: "Список помилок, знайдених у файлі.",
            items: {
              type: Type.OBJECT,
              properties: {
                line: { type: Type.INTEGER, description: "Номер рядка." },
                errorType: { type: Type.STRING, description: "Тип помилки (наприклад, 'SyntaxError', 'ImportError')." },
                message: { type: Type.STRING, description: "Опис помилки." },
                suggestion: { type: Type.STRING, description: "Пропозиція щодо виправлення." },
              },
              required: ['line', 'errorType', 'message', 'suggestion']
            }
          },
          correctedCode: { type: Type.STRING, description: "Повний вміст файлу з виправленими помилками." }
        },
        required: ['fileName', 'errors', 'correctedCode']
      }
    }
  },
  required: ['summary', 'files']
};

const analyzeCode = async (files: CodeFile[], apiKey: string): Promise<AnalysisReport> => {
    const ai = new GoogleGenAI({ apiKey });
    const formattedFiles = files.map(file => `// FILE: ${file.name}\n${file.content}`).join('\n\n');
    const prompt = `Проаналізуй наступні файли як єдиний проєкт, вияви синтаксичні, логічні помилки та проблеми з імпортами. Надай детальний звіт у форматі JSON українською мовою. Файли для аналізу:\n${formattedFiles}`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: { 
        systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json", 
        responseSchema: analysisSchema 
      },
    });
    return JSON.parse(response.text);
};


// --- COMPONENTS ---

const ApiKeyModal: React.FC<{ onSave: (apiKey: string) => void; }> = ({ onSave }) => {
    const [key, setKey] = React.useState('');
    const handleSave = () => key.trim() && onSave(key.trim());
    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-8 max-w-lg w-full m-4">
                <div className="flex items-center mb-4">
                    <KeyIcon className="h-8 w-8 text-yellow-400 mr-3" />
                    <h2 className="text-2xl font-bold text-white">Введіть API ключ Gemini</h2>
                </div>
                <p className="text-slate-400 mb-6 text-sm">Для роботи потрібен ваш API ключ Google AI. Він не зберігається і використовується лише протягом цієї сесії.</p>
                <input type="password" value={key} onChange={(e) => setKey(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSave()} placeholder="Вставте ваш ключ тут..." className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6" autoFocus />
                <div className="flex justify-between items-center">
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-400 hover:underline">Отримати API ключ</a>
                    <button onClick={handleSave} disabled={!key.trim()} className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 disabled:bg-slate-600 font-semibold">Зберегти</button>
                </div>
            </div>
        </div>
    );
};

const FileTabs: React.FC<{ files: CodeFile[], activeFileId: string | null, onAddFile: () => void, onSelectFile: (id: string) => void, onRemoveFile: (id: string) => void, onRenameFile: (id: string, newName: string) => void }> = ({ files, activeFileId, onAddFile, onSelectFile, onRemoveFile, onRenameFile }) => {
    const [editingTabId, setEditingTabId] = React.useState<string | null>(null);
    const [editingName, setEditingName] = React.useState('');
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => { inputRef.current?.focus(); }, [editingTabId]);

    const handleDoubleClick = (file: CodeFile) => { setEditingTabId(file.id); setEditingName(file.name); };
    const handleRename = () => { if (editingTabId && editingName.trim()) { onRenameFile(editingTabId, editingName.trim()); } setEditingTabId(null); };

    return (
        <div className="flex items-center border-b border-slate-700 bg-slate-800/50">
            <div className="flex-grow flex items-center overflow-x-auto">
                {files.map((file) => (
                    <div key={file.id} onClick={() => onSelectFile(file.id)} onDoubleClick={() => handleDoubleClick(file)} className={`flex items-center justify-between px-4 py-2 border-r border-slate-700 cursor-pointer whitespace-nowrap ${activeFileId === file.id ? 'bg-indigo-600/30 text-indigo-300 border-b-2 border-indigo-400' : 'hover:bg-slate-700/50'}`}>
                        {editingTabId === file.id ? ( <input ref={inputRef} type="text" value={editingName} onChange={(e) => setEditingName(e.target.value)} onBlur={handleRename} onKeyDown={(e) => e.key === 'Enter' ? handleRename() : e.key === 'Escape' && setEditingTabId(null)} className="bg-slate-900 text-white outline-none p-0 m-0 text-sm w-24" /> ) : ( <span className="text-sm mr-2">{file.name}</span> )}
                        <button onClick={(e) => { e.stopPropagation(); onRemoveFile(file.id); }} className="p-0.5 rounded-full hover:bg-slate-600 text-slate-400 hover:text-white"><XIcon className="h-3 w-3" /></button>
                    </div>
                ))}
            </div>
            <button onClick={onAddFile} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700"><PlusIcon className="h-5 w-5" /></button>
        </div>
    );
};

const CodeEditor: React.FC<{ content: string, onChange: (content: string) => void }> = ({ content, onChange }) => ( <textarea value={content} onChange={(e) => onChange(e.target.value)} placeholder="Код файлу..." className="w-full h-full bg-slate-900 text-slate-300 p-4 font-mono text-sm resize-none focus:outline-none leading-relaxed" spellCheck="false" /> );

const Preview: React.FC<{ files: CodeFile[] }> = ({ files }) => {
    const srcDoc = React.useMemo(() => {
        const htmlFile = files.find(f => f.name.endsWith('.html'));
        if (!htmlFile) return '<html><body style="background-color:#1e293b; color: #94a3b8; font-family: sans-serif; text-align: center; padding-top: 2rem;">Файл index.html не знайдено.</body></html>';

        let content = htmlFile.content;
        const cssFiles = files.filter(f => f.name.endsWith('.css'));
        const jsFiles = files.filter(f => f.name.endsWith('.js'));
        const cssLinks = cssFiles.map(f => `<style>${f.content}</style>`).join('');
        const jsScripts = jsFiles.map(f => `<script>${f.content}</script>`).join('');
        content = content.replace('</head>', `${cssLinks}</head>`);
        content = content.replace('</body>', `${jsScripts}</body>`);
        return content;
    }, [files]);

    return <iframe srcDoc={srcDoc} title="preview" className="w-full h-full border-0 bg-white" sandbox="allow-scripts allow-modals" />;
};

const ChatPanel: React.FC<{ onGenerate: (prompt: string) => void, isLoading: boolean, error: string | null }> = ({ onGenerate, isLoading, error }) => {
    const [prompt, setPrompt] = React.useState('');
    const handleGenerate = () => { if (prompt.trim() && !isLoading) { onGenerate(prompt.trim()); setPrompt(''); } };
    return (
        <div className="h-full w-full flex flex-col p-4 gap-4">
            <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-500">
                 <SparklesIcon className="h-16 w-16 mb-4 text-slate-600" />
                 <h2 className="text-xl font-bold text-slate-300">J.A.R.V.I.S. Чат</h2>
                 <p className="mt-2 max-w-md text-slate-400 text-sm">Опишіть, що потрібно створити або змінити в активному файлі.</p>
            </div>
             {error && <div className="bg-red-900/50 text-red-300 p-3 rounded-md text-sm">{error}</div>}
            <div className="flex-shrink-0 flex items-center gap-2">
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }} placeholder="Ваш запит до J.A.R.V.I.S...." className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" rows={2} disabled={isLoading}/>
                <button onClick={handleGenerate} disabled={isLoading || !prompt.trim()} className="p-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 disabled:bg-slate-600 transition-colors">
                    {isLoading ? <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div> : <PaperAirplaneIcon />}
                </button>
            </div>
        </div>
    );
};

const AnalysisPanel: React.FC<{ report: AnalysisReport | null; isLoading: boolean; error: string | null; onApplyFix: (fileName: string, correctedCode: string) => void; }> = ({ report, isLoading, error, onApplyFix }) => {
    if (isLoading) return <div className="flex justify-center items-center h-full"><div className="w-8 h-8 border-4 border-t-transparent border-indigo-400 rounded-full animate-spin"></div></div>;
    if (error) return <div className="p-4 text-red-400 text-center">{error}</div>
    if (!report) return (
        <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-4">
            <DocumentMagnifyingGlassIcon className="h-16 w-16 mb-4 text-slate-600" />
            <h2 className="text-xl font-bold text-slate-300">Аналіз коду</h2>
            <p className="mt-2 max-w-md text-slate-400 text-sm">Натисніть кнопку "Аналізувати код", щоб J.A.R.V.I.S. перевірив файли на помилки.</p>
        </div>
    );
    return (
      <div className="p-4 overflow-y-auto h-full">
        <h2 className="text-xl font-bold text-indigo-300 mb-3">Звіт про аналіз</h2>
        <div className="bg-slate-800/50 p-3 rounded-lg mb-4">
          <h3 className="font-semibold text-slate-200 mb-1">Підсумок від J.A.R.V.I.S.</h3>
          <p className="text-slate-400 text-sm">{report.summary}</p>
        </div>
        {report.files.map((file) => (
          <div key={file.fileName} className="mb-4">
            <h3 className="flex items-center font-semibold text-slate-100 mb-2"><FileCodeIcon className="h-5 w-5 mr-2 text-slate-400"/>{file.fileName}</h3>
            {file.errors.length > 0 ? (
                <div className="space-y-3">
                {file.errors.map((err, i) => (
                    <div key={i} className="bg-slate-800 border-l-4 border-yellow-500 p-3 rounded-r-md"><p className="font-mono text-xs text-red-400">Рядок {err.line}: <span className="font-semibold text-yellow-400">{err.errorType}</span></p><p className="text-slate-300 text-sm my-1">{err.message}</p><p className="font-mono text-sm text-green-400 bg-slate-900 p-2 rounded mt-2">{err.suggestion}</p></div>
                ))}
                </div>
            ) : <p className="text-green-400 text-sm bg-green-900/20 p-2 rounded-md">Помилок не знайдено.</p>}
            {file.correctedCode && <button onClick={() => onApplyFix(file.fileName, file.correctedCode!)} className="mt-3 px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-500">Застосувати виправлення</button>}
          </div>
        ))}
      </div>
    );
};


// --- APP ---
const App: React.FC = () => {
    const [files, setFiles] = React.useState<CodeFile[]>([]);
    const [activeFileId, setActiveFileId] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState<boolean>(false);
    const [loadingAction, setLoadingAction] = React.useState<'generate' | 'analyze' | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [apiKey, setApiKey] = React.useState<string>('');
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = React.useState<boolean>(true);
    const [analysisReport, setAnalysisReport] = React.useState<AnalysisReport | null>(null);
    const [activeTab, setActiveTab] = React.useState<'chat' | 'analysis'>('chat');

    const activeFile = React.useMemo(() => files.find(f => f.id === activeFileId), [files, activeFileId]);
    
    const handleAddFile = () => {
        const newFile: CodeFile = { id: `file_${Date.now()}`, name: `new${files.length + 1}.js`, content: '' };
        setFiles([...files, newFile]);
        setActiveFileId(newFile.id);
    };
    const handleRemoveFile = (id: string) => {
        const newFiles = files.filter(f => f.id !== id);
        setFiles(newFiles);
        if (activeFileId === id) setActiveFileId(newFiles[0]?.id || null);
    };
    const handleSelectFile = (id: string) => setActiveFileId(id);
    const handleCodeChange = (content: string) => setFiles(files.map(f => f.id === activeFileId ? { ...f, content } : f));
    const handleFileNameChange = (id: string, newName: string) => setFiles(files.map(f => (f.id === id ? { ...f, name: newName } : f)));
    const handleSaveApiKey = (key: string) => { setApiKey(key); setIsApiKeyModalOpen(false); setError(null); };

    const handleGenerateSiteStream = async (prompt: string) => {
        if (!apiKey) { setIsApiKeyModalOpen(true); return; }
        if (!activeFileId) { setError("Будь ласка, оберіть файл для редагування."); return; }
        
        setIsLoading(true); setLoadingAction('generate'); setError(null);
        
        try {
            const ai = new GoogleGenAI({ apiKey });
            const chat: Chat = ai.chats.create({
                model: 'gemini-2.5-pro',
                config: { systemInstruction: JARVIS_SYSTEM_INSTRUCTION },
            });

            const fullPrompt = `Онови або повністю перепиши вміст поточного файлу (${activeFile?.name}) на основі цього запиту: "${prompt}". Поверни тільки код, без пояснень, форматування markdown чи назви файлу.`;
            
            // Clear content before streaming
            handleCodeChange('');

            const response = await chat.sendMessageStream({ message: fullPrompt });

            for await (const chunk of response) {
                // Append chunk to the current content
                setFiles(currentFiles => 
                    currentFiles.map(f => 
                        f.id === activeFileId ? { ...f, content: f.content + chunk.text } : f
                    )
                );
            }

        } catch (err) { 
            setError(err instanceof Error ? err.message : "Сталася невідома помилка під час генерації.");
        } finally { 
            setIsLoading(false); 
            setLoadingAction(null); 
        }
    };


    const handleAnalyzeCode = async () => {
        if (!apiKey) { setIsApiKeyModalOpen(true); return; }
        setIsLoading(true); setLoadingAction('analyze'); setError(null); setAnalysisReport(null);
        try {
            const report = await analyzeCode(files, apiKey);
            setAnalysisReport(report);
            setActiveTab('analysis');
        } catch (err) { setError(err instanceof Error ? err.message : "Сталася невідома помилка."); } finally { setIsLoading(false); setLoadingAction(null); }
    };

    const handleApplyFix = (fileName: string, correctedCode: string) => {
        setFiles(files.map(f => f.name === fileName ? { ...f, content: correctedCode } : f));
    };

    return (
        <div className="h-screen w-screen flex flex-col bg-slate-900 text-white">
            {isApiKeyModalOpen && <ApiKeyModal onSave={handleSaveApiKey} />}
            <header className="flex-shrink-0 p-3 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 flex justify-between items-center">
                <h1 className="text-xl font-bold text-slate-200">AI Web Dev Hub</h1>
                <div className="flex items-center gap-4">
                    <button onClick={handleAnalyzeCode} disabled={isLoading || !apiKey} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:bg-slate-600 font-semibold"><DocumentMagnifyingGlassIcon className="h-5 w-5 mr-2" />{loadingAction === 'analyze' ? 'Аналізую...' : 'Аналізувати код'}</button>
                    <button onClick={() => setIsApiKeyModalOpen(true)} className="p-2 rounded-md hover:bg-slate-700" title="Змінити API ключ"><KeyIcon className="h-5 w-5 text-slate-400" /></button>
                </div>
            </header>
            <main className="flex-grow grid grid-cols-1 md:grid-cols-3 h-full min-h-0">
                <div className="col-span-1 border-r border-slate-700 flex flex-col bg-slate-800/40">
                    <div className="flex-shrink-0 flex border-b border-slate-700">
                        <button onClick={() => setActiveTab('chat')} className={`flex-1 p-3 text-sm font-semibold ${activeTab === 'chat' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}>Чат / Генерація</button>
                        <button onClick={() => setActiveTab('analysis')} className={`flex-1 p-3 text-sm font-semibold ${activeTab === 'analysis' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}>Аналіз коду</button>
                    </div>
                    <div className="flex-grow min-h-0">
                        {activeTab === 'chat' ? <ChatPanel onGenerate={handleGenerateSiteStream} isLoading={isLoading && loadingAction === 'generate'} error={error} /> : <AnalysisPanel report={analysisReport} isLoading={isLoading && loadingAction === 'analyze'} error={error} onApplyFix={handleApplyFix} />}
                    </div>
                </div>
                <div className="col-span-2 flex flex-col h-full min-h-0">
                    <div className="h-1/2 flex flex-col border-b border-slate-700">
                        <FileTabs files={files} activeFileId={activeFileId} onAddFile={handleAddFile} onSelectFile={handleSelectFile} onRemoveFile={handleRemoveFile} onRenameFile={handleFileNameChange} />
                        <div className="flex-grow h-full min-h-0">{activeFile ? <CodeEditor content={activeFile.content} onChange={handleCodeChange} /> : <div className="p-4 text-slate-500 text-center">Оберіть або створіть файл.</div>}</div>
                    </div>
                    <div className="h-1/2">
                      <Preview files={files} />
                    </div>
                </div>
            </main>
        </div>
    );
};

// --- RENDER ---
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);