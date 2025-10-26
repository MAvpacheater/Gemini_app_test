import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// region --- TYPES ---
interface File {
  name: string;
  content: string;
}

interface ProjectPlan {
  projectName: string;
  description: string;
  files: {
    fileName: string;
    description: string;
  }[];
}

type GenerationStep = 'idle' | 'planning' | 'reviewing' | 'generating' | 'editing';
// endregion

// region --- ICONS ---
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);
const FileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
);
const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
);
const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
);
// endregion

const App = () => {
  // region --- STATE ---
  const [files, setFiles] = useState<File[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyReady, setApiKeyReady] = useState(false);

  const [prompt, setPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [generationStep, setGenerationStep] = useState<GenerationStep>('idle');
  const [projectPlan, setProjectPlan] = useState<ProjectPlan | null>(null);
  const [editablePlanPrompt, setEditablePlanPrompt] = useState('');

  const [activeTab, setActiveTab] = useState<'chat' | 'analysis'>('chat');
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // endregion

  // region --- API KEY MANAGEMENT ---
  useEffect(() => {
    const initializeApiKey = async () => {
      while (!window.aistudio) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const storedKeyStatus = localStorage.getItem('apiKeyReady');
      if (storedKeyStatus === 'true') {
        setApiKeyReady(true);
        return;
      }

      try {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (hasKey) {
            setApiKeyReady(true);
            localStorage.setItem('apiKeyReady', 'true');
        } else {
            setIsApiKeyModalOpen(true);
        }
      } catch (e) {
         console.error("Error checking for API key:", e);
         setIsApiKeyModalOpen(true);
      }
    };

    initializeApiKey();
  }, []);

  const handleSelectKey = async () => {
    try {
      await window.aistudio.openSelectKey();
      setApiKeyReady(true);
      localStorage.setItem('apiKeyReady', 'true');
      setIsApiKeyModalOpen(false);
    } catch (e) {
      console.error("Failed to open API key selection:", e);
    }
  };

  const withApiKeyCheck = <T extends any[]>(fn: (...args: T) => Promise<void>) => {
    return async (...args: T) => {
      if (!apiKeyReady) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (hasKey) {
            setApiKeyReady(true);
            localStorage.setItem('apiKeyReady', 'true');
        } else {
          setIsApiKeyModalOpen(true);
          return;
        }
      }
      try {
        await fn(...args);
      } catch (error: any) {
        console.error("API call failed:", error);
        if (error.message.includes("entity was not found") || error.message.includes("API key not valid")) {
          setApiKeyReady(false);
          localStorage.removeItem('apiKeyReady');
          setIsApiKeyModalOpen(true);
          alert("Здається, ваш API ключ недійсний. Будь ласка, оберіть дійсний ключ.");
        }
      }
    };
  };
  // endregion

  // region --- FILE & PREVIEW MANAGEMENT ---
  const getWelcomeHtml = () => `
    <!DOCTYPE html>
    <html lang="uk">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { background-color: #111827; color: #9CA3AF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; text-align: center; }
            .container { max-width: 400px; }
            h1 { color: #F9FAFB; font-size: 24px; }
            p { font-size: 16px; margin-top: 8px; line-height: 1.5; }
            code { background-color: #374151; color: #F3F4F6; padding: 3px 6px; border-radius: 4px; font-family: 'Courier New', Courier, monospace; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Ласкаво просимо до J.A.R.V.I.S. Студії</h1>
            <p>Опишіть сайт, який ви хочете створити, у панелі <b>Чат / Генерація</b>.</p>
            <p>Або створіть новий файл за допомогою кнопки <code>+</code>, щоб почати кодувати вручну.</p>
        </div>
    </body>
    </html>
  `;
  
  const getFullHtmlContent = () => {
    if (files.length === 0) return getWelcomeHtml();

    const htmlFile = files.find(f => f.name.endsWith('.html'));
    if (!htmlFile) return '<html><body style="background-color:#111827; color:#F9FAFB; font-family:sans-serif; text-align:center; padding-top: 2rem;"><h1>HTML файл не знайдено</h1><p>Створіть файл `index.html`, щоб побачити попередній перегляд.</p></body></html>';
  
    const cssFiles = files.filter(f => f.name.endsWith('.css'));
    const jsFiles = files.filter(f => f.name.endsWith('.js'));
    let content = htmlFile.content;
  
    const cssLinks = cssFiles.map(f => `<style>\n${f.content}\n</style>`).join('\n');
    if (content.includes('</head>')) {
      content = content.replace('</head>', `${cssLinks}\n</head>`);
    } else {
      content = cssLinks + content;
    }
  
    const jsScripts = jsFiles.map(f => `<script>\n${f.content}\n</script>`).join('\n');
    if (content.includes('</body>')) {
      content = content.replace('</body>', `${jsScripts}\n</body>`);
    } else {
      content += jsScripts;
    }
  
    return content;
  };

  useEffect(() => {
    if (iframeRef.current) {
        iframeRef.current.srcdoc = getFullHtmlContent();
    }
  }, [files]);
  
  const handleFileContentChange = (content: string) => {
    if (activeFile) {
      setFiles(files.map(f => f.name === activeFile ? { ...f, content } : f));
    }
  };

  const addFile = () => {
    const fileName = prompt("Введіть ім'я файлу (напр., index.html, style.css):");
    if (fileName && !files.some(f => f.name === fileName)) {
      setFiles([...files, { name: fileName, content: '' }]);
      setActiveFile(fileName);
    } else if (fileName) {
      alert("Файл з таким іменем вже існує.");
    }
  };

  const deleteFile = (fileName: string) => {
    if (confirm(`Ви впевнені, що хочете видалити ${fileName}?`)) {
      setFiles(files.filter(f => f.name !== fileName));
      if (activeFile === fileName) {
        setActiveFile(files.length > 1 ? files.filter(f => f.name !== fileName)[0].name : null);
      }
    }
  };
  
  const renameFile = (oldName: string) => {
    const newName = prompt("Введіть нове ім'я файлу:", oldName);
    if (newName && newName !== oldName && !files.some(f => f.name === newName)) {
      setFiles(files.map(f => f.name === oldName ? { ...f, name: newName } : f));
      if (activeFile === oldName) {
        setActiveFile(newName);
      }
    } else if (newName) {
      alert("Файл з таким іменем вже існує або ім'я не змінено.");
    }
  };

  const activeFileContent = files.find(f => f.name === activeFile)?.content ?? '';
  // endregion

  // region --- J.A.R.V.I.S. (GEMINI) LOGIC ---
  const JARVIS_SYSTEM_INSTRUCTION = `You are J.A.R.V.I.S., a professional programmer and debugger. Your primary goal is to produce high-quality, functional, and clean code. You must strictly follow the user's request without adding your own creative ideas.
  - When asked to create a project from scratch, your first step is to propose a concise plan and file structure for user approval before writing any code.
  - When asked to edit code, you output only the raw code for the specified file. Do not use markdown like \`\`\`html.
  - When asked to analyze code, provide a clear, concise report of errors, potential bugs, and suggestions for improvement in Ukrainian.`;

  const getAi = useCallback(() => new GoogleGenAI({ apiKey: process.env.API_KEY }), [apiKeyReady]);

  const generatePlan = async (userPrompt: string) => {
    setIsGenerating(true);
    setGenerationStep('planning');
    setChatHistory(prev => [...prev, { role: 'user', content: userPrompt }]);
    
    const ai = getAi();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `The user wants to build a website. Their request is: "${userPrompt}". Based on this, create a project plan.`,
        config: {
          systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              projectName: { type: Type.STRING, description: "A short, descriptive name for the project." },
              description: { type: Type.STRING, description: "A one or two-sentence summary of what the project does." },
              files: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    fileName: { type: Type.STRING, description: "The name of the file (e.g., index.html, style.css, script.js)." },
                    description: { type: Type.STRING, description: "A brief, one-sentence description of this file's purpose." }
                  }
                }
              }
            }
          }
        }
      });

      // FIX: Use the .text property to access the response text, not .text() method.
      const plan = JSON.parse(response.text) as ProjectPlan;
      setProjectPlan(plan);
      setEditablePlanPrompt(`Мета проєкту: ${userPrompt}\n\nПлан від J.A.R.V.I.S.:\n${plan.description}`);
      setGenerationStep('reviewing');

    } catch (error) {
      console.error("Error generating plan:", error);
      setChatHistory(prev => [...prev, { role: 'assistant', content: "Вибачте, сталася помилка під час створення плану проєкту." }]);
      setGenerationStep('idle');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSiteFromPlan = async () => {
    if (!projectPlan) return;
    setIsGenerating(true);
    setGenerationStep('generating');
    setChatHistory(prev => [...prev, { role: 'assistant', content: "Чудово. Зараз я згенерую код на основі затвердженого плану." }]);

    const ai = getAi();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `Generate the code for the following project plan. The user's original goal was: "${prompt}". The agreed plan is: ${JSON.stringify(projectPlan)}. The user has provided final instructions: "${editablePlanPrompt}". Create all the necessary files with high-quality code. Ensure the HTML file links to the CSS and JS files correctly if they are created.`,
        config: {
          systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              files: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    content: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });
      
      // FIX: Use the .text property to access the response text, not .text() method.
      const result = JSON.parse(response.text);
      const newFiles: File[] = result.files;
      setFiles(newFiles);
      setActiveFile(newFiles.find(f => f.name.endsWith('.html'))?.name || newFiles[0]?.name || null);
      setChatHistory(prev => [...prev, { role: 'assistant', content: "Проєкт створено. Ви можете переглянути файли в редакторі." }]);
    } catch (error) {
      console.error("Error generating site:", error);
      setChatHistory(prev => [...prev, { role: 'assistant', content: "Вибачте, мені не вдалося згенерувати файли проєкту." }]);
    } finally {
      setIsGenerating(false);
      setGenerationStep('editing');
      setPrompt('');
      setProjectPlan(null);
    }
  };

  const editFileWithStreaming = async (userPrompt: string) => {
    if (!activeFile) {
        alert("Будь ласка, оберіть файл для редагування.");
        return;
    }
    setIsGenerating(true);
    setChatHistory(prev => [...prev, { role: 'user', content: userPrompt }]);
    
    const ai = getAi();
    try {
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: `The user wants to edit the file named '${activeFile}'. The current content is:\n\n${activeFileContent}\n\nTheir instruction is: "${userPrompt}".\n\nProvide the complete, updated raw code for the file.`,
            config: { systemInstruction: JARVIS_SYSTEM_INSTRUCTION }
        });

        let accumulatedContent = '';
        handleFileContentChange('');
        for await (const chunk of responseStream) {
            accumulatedContent += chunk.text;
            handleFileContentChange(accumulatedContent);
        }
        
    } catch (error) {
        console.error("Error editing file:", error);
        setChatHistory(prev => [...prev, { role: 'assistant', content: `Вибачте, сталася помилка під час редагування ${activeFile}.` }]);
    } finally {
        setIsGenerating(false);
        setPrompt('');
    }
  };
  
  const analyzeCode = async () => {
    if (files.length === 0) {
      alert("Немає файлів для аналізу.");
      return;
    }
    setIsAnalyzing(true);
    setActiveTab('analysis');
    setAnalysisResult("J.A.R.V.I.S. аналізує ваш код...");

    const ai = getAi();
    try {
      const allFilesContent = files.map(f => `--- FILE: ${f.name} ---\n\n${f.content}`).join('\n\n---\n\n');
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `Analyze the following project files for errors, bugs, and potential improvements. Provide a concise report in markdown format in Ukrainian.\n\n${allFilesContent}`,
        config: { systemInstruction: JARVIS_SYSTEM_INSTRUCTION }
      });
      setAnalysisResult(response.text);
    } catch (error) {
      console.error("Error analyzing code:", error);
      setAnalysisResult("Під час аналізу сталася помилка.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = withApiKeyCheck(async () => {
    if (!prompt.trim()) return;

    if (files.length === 0) {
        await generatePlan(prompt);
    } else {
        await editFileWithStreaming(prompt);
    }
  });

  const handleConfirmPlan = withApiKeyCheck(async () => {
    await generateSiteFromPlan();
  });
  // endregion

  // region --- RENDER ---
  const renderApiKeyModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gray-800 p-8 rounded-lg shadow-2xl text-center max-w-md border border-gray-700">
        <h2 className="text-2xl font-bold mb-4 text-gray-100">Потрібен API Ключ</h2>
        <p className="mb-6 text-gray-300">Для використання J.A.R.V.I.S. необхідно обрати API ключ Gemini. Ваш ключ використовується лише для поточної сесії і не зберігається на наших серверах.</p>
        <p className="mb-6 text-sm text-gray-400">Інформація про тарифи: <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">ai.google.dev/gemini-api/docs/billing</a>.</p>
        <button
          onClick={handleSelectKey}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg transition-colors w-full"
        >
          Обрати API Ключ
        </button>
      </div>
    </div>
  );

  const renderFileTabs = () => (
    <div className="flex-grow flex flex-col min-h-0">
      <div className="flex items-center border-b border-gray-700 bg-gray-900">
        <div className="flex items-center overflow-x-auto">
          {files.map(file => (
            <div key={file.name} className={`group flex items-center pr-2 cursor-pointer text-sm border-r border-gray-700 ${activeFile === file.name ? 'bg-gray-950 text-blue-400' : 'text-gray-400 hover:bg-gray-800'}`}>
              <button onClick={() => setActiveFile(file.name)} className="flex items-center gap-2 p-3">
                <FileIcon /> {file.name}
              </button>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button onClick={() => renameFile(file.name)} className="hover:text-blue-400 p-1 rounded-full hover:bg-gray-700"><EditIcon /></button>
                <button onClick={() => deleteFile(file.name)} className="hover:text-red-400 p-1 rounded-full hover:bg-gray-700"><TrashIcon /></button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={addFile} className="p-3 hover:bg-gray-800 border-l border-gray-700"><PlusIcon /></button>
      </div>
      <textarea
        ref={editorRef}
        value={activeFileContent}
        onChange={(e) => handleFileContentChange(e.target.value)}
        className="w-full h-full p-4 bg-gray-950 text-gray-300 font-mono text-sm focus:outline-none resize-none selection:bg-blue-500/30"
        placeholder="Оберіть або створіть файл, щоб почати."
        disabled={!activeFile}
      />
    </div>
  );
  
  const renderPlanReview = () => (
    <div className="p-4 bg-gray-800 rounded-lg overflow-y-auto border border-gray-700">
        <h3 className="text-lg font-bold mb-3 text-blue-300">Розгляд Плану Проєкту</h3>
        <div className="mb-4">
            <h4 className="font-semibold text-gray-300">Назва Проєкту:</h4>
            <p className="text-gray-400">{projectPlan?.projectName}</p>
        </div>
        <div className="mb-4">
            <h4 className="font-semibold text-gray-300">Опис:</h4>
            <p className="text-gray-400">{projectPlan?.description}</p>
        </div>
        <div className="mb-4">
            <h4 className="font-semibold text-gray-300">Структура Файлів:</h4>
            <ul className="list-disc list-inside text-gray-400 space-y-1">
                {projectPlan?.files.map(f => <li key={f.fileName}><b>{f.fileName}</b>: {f.description}</li>)}
            </ul>
        </div>
        <div className="mt-4">
            <label htmlFor="plan-mods" className="block font-semibold text-gray-300 mb-2">Зміни або додаткові інструкції:</label>
            <textarea 
                id="plan-mods"
                value={editablePlanPrompt}
                onChange={(e) => setEditablePlanPrompt(e.target.value)}
                className="w-full h-24 p-2 bg-gray-900 text-gray-300 font-mono text-sm rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
        </div>
        <div className="flex gap-2 mt-4">
            <button
                onClick={handleConfirmPlan}
                disabled={isGenerating}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-600"
            >
                {isGenerating ? 'Генерація...' : 'Створити Проєкт за Планом'}
            </button>
             <button
                onClick={() => { setGenerationStep('idle'); setProjectPlan(null); setPrompt(''); }}
                disabled={isGenerating}
                className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors"
            >
                Скасувати
            </button>
        </div>
    </div>
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-950 text-gray-300">
      {isApiKeyModalOpen && renderApiKeyModal()}
      <header className="flex items-center justify-between p-2 bg-gray-950/80 backdrop-blur-sm border-b border-gray-800 text-white z-10">
        <h1 className="text-lg font-bold pl-2">J.A.R.V.I.S. Веб-студія</h1>
        <button
          onClick={withApiKeyCheck(analyzeCode)}
          disabled={isAnalyzing || files.length === 0}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? "Аналіз..." : "Аналізувати Код"}
        </button>
      </header>

      <div className="flex flex-grow min-h-0">
        <div className="w-1/3 flex flex-col p-4 bg-gray-900 border-r border-gray-800">
            <div className="flex border-b border-gray-700 mb-2">
                <button onClick={() => setActiveTab('chat')} className={`py-2 px-4 text-sm font-medium ${activeTab === 'chat' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}>Чат / Генерація</button>
                <button onClick={() => setActiveTab('analysis')} className={`py-2 px-4 text-sm font-medium ${activeTab === 'analysis' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}>Звіт Аналізу</button>
            </div>
            
            <div className="flex-grow flex flex-col min-h-0">
                {activeTab === 'chat' && (
                    <>
                        <div className="flex-grow overflow-y-auto mb-4 space-y-4 pr-2">
                            {chatHistory.map((msg, index) => (
                                <div key={index} className={`p-3 rounded-lg w-fit max-w-sm ${msg.role === 'user' ? 'bg-blue-900/70 ml-auto' : 'bg-gray-700'}`}>
                                    <p className="text-sm text-gray-200 whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            ))}
                            {generationStep === 'reviewing' && projectPlan && renderPlanReview()}
                             {isGenerating && generationStep !== 'reviewing' && <div className="p-3 rounded-lg bg-gray-700 text-sm w-fit">J.A.R.V.I.S. думає...</div>}
                        </div>
                        {generationStep !== 'reviewing' && (
                           <div className="flex">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                    placeholder={files.length === 0 ? "Опишіть сайт, який ви хочете створити..." : `Опишіть зміни для ${activeFile}...`}
                                    className="flex-grow p-2 bg-gray-800 border border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-200"
                                    rows={3}
                                    disabled={isGenerating}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={isGenerating || !prompt.trim()}
                                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold p-2 rounded-r-md disabled:bg-gray-700"
                                >
                                    Надіслати
                                </button>
                            </div>
                        )}
                    </>
                )}
                 {activeTab === 'analysis' && (
                    <div className="prose prose-invert prose-sm p-4 bg-gray-900 rounded-lg overflow-y-auto h-full border border-gray-700 text-gray-300 whitespace-pre-wrap">
                      {analysisResult || "Створіть файли та натисніть 'Аналізувати Код', щоб побачити звіт."}
                    </div>
                )}
            </div>
        </div>

        <div className="w-2/3 flex flex-col">
            <div className="h-1/2 flex flex-col">
              {renderFileTabs()}
            </div>
            <div className="h-1/2 border-t-2 border-gray-800">
              <iframe
                ref={iframeRef}
                title="Live Preview"
                className="w-full h-full bg-white"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
        </div>
      </div>
    </div>
  );
  // endregion
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);