// FIX: Add missing React and ReactDOM imports to enable JSX and DOM rendering.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- TYPES ---
interface CodeFile {
  id: string;
  name: string;
  content: string;
}

interface SiteGenerationResponse {
    files: Array<{
        fileName: string;
        content: string;
    }>;
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


// --- GEMINI SERVICE ---
const siteGenerationSchema = {
    type: Type.OBJECT,
    properties: {
        files: {
            type: Type.ARRAY,
            description: "Масив об'єктів файлів для створення веб-сайту.",
            items: {
                type: Type.OBJECT,
                properties: {
                    fileName: {
                        type: Type.STRING,
                        description: "Назва файлу (наприклад, 'index.html', 'style.css', 'script.js')."
                    },
                    content: {
                        type: Type.STRING,
                        description: "Повний вміст файлу."
                    }
                },
                required: ['fileName', 'content']
            }
        }
    },
    required: ['files']
};

const generateSite = async (prompt: string, existingFiles: CodeFile[], apiKey: string): Promise<SiteGenerationResponse> => {
    if (!apiKey) throw new Error("API ключ не надано.");
    const ai = new GoogleGenAI({ apiKey });

    const formattedFiles = existingFiles.map(file => `
// FILE: ${file.name}
// --- START OF CODE ---
${file.content}
// --- END OF CODE ---
`).join('\n\n');

    const fullPrompt = `
        Ти — експерт з веб-розробки. Створи або онови файли для веб-сайту на основі запиту користувача.

        Запит користувача: "${prompt}"

        Існуючі файли (якщо є):
        ${formattedFiles}

        Твоє завдання:
        1.  Згенерувати повний набір файлів (HTML, CSS, JavaScript), необхідних для реалізації запиту.
        2.  Завжди створюй файл 'index.html' як основний.
        3.  В 'index.html' ОБОВ'ЯЗКОВО правильно підключи файли стилів та скриптів. Наприклад: '<link rel="stylesheet" href="style.css">' та '<script src="script.js" defer></script>'. Використовуй відносні шляхи.
        4.  Якщо користувач просить оновити існуючий сайт, модифікуй надані файли.
        5.  Надай відповідь у форматі JSON, що відповідає наданій схемі. Вся відповідь має бути українською мовою.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: siteGenerationSchema,
            },
        });
        // FIX: The error "This expression is not callable. Type 'String' has no call signatures" often points to a mix-up between accessing a string property (`.text`) and calling it as a function (`.text()`).
        // To prevent this and align with best practices, we use the `text` property directly. `JSON.parse` handles any surrounding whitespace.
        const jsonText = response.text;
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating site with Gemini API:", error);
        if (error instanceof Error && error.message.includes('API key not valid')) {
            throw new Error("Наданий API ключ недійсний.");
        }
        throw new Error("Не вдалося згенерувати сайт. Перевірте ваш API ключ та з'єднання.");
    }
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
                <p className="text-slate-400 mb-6 text-sm">Для генерації сайту потрібен ваш API ключ Google AI. Він не зберігається і використовується лише протягом цієї сесії.</p>
                <input
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    placeholder="Вставте ваш ключ тут..."
                    className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6"
                    autoFocus
                />
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

    return (
        <div className="flex items-center border-b border-slate-700 bg-slate-800/50">
            <div className="flex-grow flex items-center overflow-x-auto">
                {files.map((file) => (
                    <div key={file.id} onClick={() => onSelectFile(file.id)} onDoubleClick={() => handleDoubleClick(file)} className={`flex items-center justify-between px-4 py-2 border-r border-slate-700 cursor-pointer whitespace-nowrap ${activeFileId === file.id ? 'bg-indigo-600/30 text-indigo-300 border-b-2 border-indigo-400' : 'hover:bg-slate-700/50'}`}>
                        {editingTabId === file.id ? (
                            <input ref={inputRef} type="text" value={editingName} onChange={(e) => setEditingName(e.target.value)} onBlur={handleRename} onKeyDown={(e) => e.key === 'Enter' ? handleRename() : e.key === 'Escape' && setEditingTabId(null)} className="bg-slate-900 text-white outline-none p-0 m-0 text-sm w-24" />
                        ) : (
                            <span className="text-sm mr-2">{file.name}</span>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); onRemoveFile(file.id); }} className="p-0.5 rounded-full hover:bg-slate-600 text-slate-400 hover:text-white"><XIcon className="h-3 w-3" /></button>
                    </div>
                ))}
            </div>
            <button onClick={onAddFile} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700"><PlusIcon className="h-5 w-5" /></button>
        </div>
    );
};

const CodeEditor: React.FC<{ content: string, onChange: (content: string) => void }> = ({ content, onChange }) => (
    <div className="h-full w-full bg-slate-900">
        <textarea value={content} onChange={(e) => onChange(e.target.value)} placeholder="Код файлу..." className="w-full h-full bg-transparent text-slate-300 p-4 font-mono text-sm resize-none focus:outline-none leading-relaxed" spellCheck="false" />
    </div>
);

const Preview: React.FC<{ files: CodeFile[] }> = ({ files }) => {
    const [srcDoc, setSrcDoc] = React.useState('');

    React.useEffect(() => {
        const htmlFile = files.find(f => f.name.endsWith('.html'));
        if (!htmlFile) {
            setSrcDoc('<html><body style="background-color:#1e293b; color: #94a3b8; font-family: sans-serif; text-align: center; padding-top: 2rem;">Файл index.html не знайдено.</body></html>');
            return;
        }

        let content = htmlFile.content;
        const cssFiles = files.filter(f => f.name.endsWith('.css'));
        const jsFiles = files.filter(f => f.name.endsWith('.js'));

        const cssLinks = cssFiles.map(f => `<style>${f.content}</style>`).join('');
        const jsScripts = jsFiles.map(f => `<script>${f.content}</script>`).join('');

        // Inject styles into head, and scripts before closing body tag
        content = content.replace('</head>', `${cssLinks}</head>`);
        content = content.replace('</body>', `${jsScripts}</body>`);

        setSrcDoc(content);
    }, [files]);

    return (
        <div className="h-full w-full bg-white">
            <iframe srcDoc={srcDoc} title="preview" className="w-full h-full border-0" sandbox="allow-scripts allow-modals" />
        </div>
    );
};

const Chat: React.FC<{ onGenerate: (prompt: string) => void, isLoading: boolean, error: string | null }> = ({ onGenerate, isLoading, error }) => {
    const [prompt, setPrompt] = React.useState('');

    const handleGenerate = () => {
        if (prompt.trim() && !isLoading) {
            onGenerate(prompt.trim());
            setPrompt('');
        }
    };
    
    return (
        <div className="h-full w-full bg-slate-800/40 flex flex-col p-4 gap-4">
            <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-500">
                 <SparklesIcon className="h-16 w-16 mb-4 text-slate-600" />
                 <h2 className="text-2xl font-bold text-slate-300">Генератор сайтів AI</h2>
                 <p className="mt-2 max-w-md text-slate-400 text-sm">Опишіть сайт, який ви хочете створити. Наприклад: "Створи просту посадкову сторінку для мобільного додатку".</p>
            </div>
             {error && <div className="bg-red-900/50 text-red-300 p-3 rounded-md text-sm">{error}</div>}
            <div className="flex-shrink-0 flex items-center gap-2">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
                    placeholder="Ваш запит до AI..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    rows={2}
                    disabled={isLoading}
                />
                <button onClick={handleGenerate} disabled={isLoading || !prompt.trim()} className="p-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 disabled:bg-slate-600 transition-colors">
                    {isLoading ? <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div> : <PaperAirplaneIcon />}
                </button>
            </div>
        </div>
    );
};

// --- APP ---
const App: React.FC = () => {
    const [files, setFiles] = React.useState<CodeFile[]>([]);
    const [activeFileId, setActiveFileId] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);
    const [apiKey, setApiKey] = React.useState<string>('');
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = React.useState<boolean>(true);

    const activeFile = React.useMemo(() => files.find(f => f.id === activeFileId), [files, activeFileId]);

    const handleAddFile = () => {
        const fileCount = files.length;
        const newFile: CodeFile = { id: `file_${Date.now()}`, name: `new${fileCount + 1}.js`, content: '' };
        setFiles([...files, newFile]);
        setActiveFileId(newFile.id);
    };

    const handleRemoveFile = (id: string) => {
        const newFiles = files.filter(f => f.id !== id);
        setFiles(newFiles);
        if (activeFileId === id) {
            setActiveFileId(newFiles.length > 0 ? newFiles[0].id : null);
        }
    };

    const handleSelectFile = (id: string) => setActiveFileId(id);

    const handleCodeChange = (content: string) => {
        setFiles(files.map(f => f.id === activeFileId ? { ...f, content } : f));
    };

    const handleFileNameChange = (id: string, newName: string) => {
        setFiles(files.map(f => (f.id === id ? { ...f, name: newName } : f)));
    };

    const handleGenerateSite = async (prompt: string) => {
        if (!apiKey) {
            setIsApiKeyModalOpen(true);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const result = await generateSite(prompt, files, apiKey);
            const newFileObjects = result.files.map(generatedFile => {
                const existingFile = files.find(f => f.name === generatedFile.fileName);
                return existingFile 
                    ? { ...existingFile, content: generatedFile.content } 
                    : { id: `file_${Date.now()}_${generatedFile.fileName}`, name: generatedFile.fileName, content: generatedFile.content };
            });

            const updatedFiles = [...files];
            newFileObjects.forEach(newFile => {
                const index = updatedFiles.findIndex(f => f.name === newFile.name);
                if (index !== -1) {
                    updatedFiles[index] = newFile;
                } else {
                    updatedFiles.push(newFile);
                }
            });
            
            setFiles(updatedFiles);
            const htmlFile = updatedFiles.find(f => f.name.endsWith('.html'));
            if(htmlFile && activeFileId === null) {
                setActiveFileId(htmlFile.id);
            } else if (updatedFiles.length > 0 && activeFileId === null) {
                setActiveFileId(updatedFiles[0].id)
            }

        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Сталася невідома помилка.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveApiKey = (key: string) => {
        setApiKey(key);
        setIsApiKeyModalOpen(false);
        setError(null);
    };

    return (
        <div className="h-screen w-screen flex flex-col bg-slate-900 text-white">
            {isApiKeyModalOpen && <ApiKeyModal onSave={handleSaveApiKey} />}
            <header className="flex-shrink-0 p-3 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 flex justify-between items-center">
                <h1 className="text-xl font-bold text-slate-200">Генератор сайтів AI</h1>
                 <button onClick={() => setIsApiKeyModalOpen(true)} className="p-2 rounded-md hover:bg-slate-700" title="Змінити API ключ">
                    <KeyIcon className="h-5 w-5 text-slate-400" />
                </button>
            </header>
            <main className="flex-grow grid grid-cols-1 md:grid-cols-3 h-full min-h-0">
                <div className="col-span-1 flex flex-col border-r border-slate-700">
                    <FileTabs files={files} activeFileId={activeFileId} onAddFile={handleAddFile} onSelectFile={handleSelectFile} onRemoveFile={handleRemoveFile} onRenameFile={handleFileNameChange} />
                    <div className="flex-grow h-full min-h-0">
                        {activeFile ? <CodeEditor content={activeFile.content} onChange={handleCodeChange} /> : <div className="p-4 text-slate-500 text-center">Оберіть файл для редагування або створіть новий.</div>}
                    </div>
                </div>
                <div className="col-span-1 border-r border-slate-700">
                    <Chat onGenerate={handleGenerateSite} isLoading={isLoading} error={error} />
                </div>
                <div className="col-span-1">
                    <Preview files={files} />
                </div>
            </main>
        </div>
    );
};

// --- RENDER ---
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);
