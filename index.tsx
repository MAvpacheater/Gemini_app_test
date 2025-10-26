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
      // Poll until window.aistudio is available to prevent race condition on load
      while (!window.aistudio) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const storedKeyStatus = localStorage.getItem('apiKeyReady');
      if (storedKeyStatus === 'true') {
        setApiKeyReady(true);
        return; // Already set up
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
  }, []); // Run only once on mount

  const handleSelectKey = async () => {
    try {
      await window.aistudio.openSelectKey();
      // Assume success after dialog opens, as `hasSelectedApiKey` might have a delay
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
        // Double check the key status before showing the modal again
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
          alert("Your API key seems to be invalid. Please select a valid key.");
        }
      }
    };
  };
  // endregion

  // region --- FILE & PREVIEW MANAGEMENT ---
  const getWelcomeHtml = () => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { background-color: #1E293B; color: #94A3B8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; text-align: center; }
            .container { max-width: 400px; }
            h1 { color: #E2E8F0; font-size: 24px; }
            p { font-size: 16px; margin-top: 8px; line-height: 1.5; }
            code { background-color: #334155; color: #F1F5F9; padding: 3px 6px; border-radius: 4px; font-family: 'Courier New', Courier, monospace; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Welcome to J.A.R.V.I.S. Studio</h1>
            <p>Describe the website you want to build in the <b>Chat / Generate</b> panel.</p>
            <p>Or, create a new file with the <code>+</code> button to start coding manually.</p>
        </div>
    </body>
    </html>
  `;
  
  const getFullHtmlContent = () => {
    if (files.length === 0) return getWelcomeHtml();

    const htmlFile = files.find(f => f.name.endsWith('.html'));
    if (!htmlFile) return '<html><body style="background-color:#1E293B; color:#E2E8F0; font-family:sans-serif; text-align:center; padding-top: 2rem;"><h1>No HTML file found</h1><p>Create an `index.html` file to see a preview.</p></body></html>';
  
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
    const fileName = prompt("Enter file name (e.g., index.html, style.css):");
    if (fileName && !files.some(f => f.name === fileName)) {
      setFiles([...files, { name: fileName, content: '' }]);
      setActiveFile(fileName);
    } else if (fileName) {
      alert("A file with that name already exists.");
    }
  };

  const deleteFile = (fileName: string) => {
    if (confirm(`Are you sure you want to delete ${fileName}?`)) {
      setFiles(files.filter(f => f.name !== fileName));
      if (activeFile === fileName) {
        setActiveFile(files.length > 1 ? files.filter(f => f.name !== fileName)[0].name : null);
      }
    }
  };
  
  const renameFile = (oldName: string) => {
    const newName = prompt("Enter new file name:", oldName);
    if (newName && newName !== oldName && !files.some(f => f.name === newName)) {
      setFiles(files.map(f => f.name === oldName ? { ...f, name: newName } : f));
      if (activeFile === oldName) {
        setActiveFile(newName);
      }
    } else if (newName) {
      alert("A file with that name already exists or the name is unchanged.");
    }
  };

  const activeFileContent = files.find(f => f.name === activeFile)?.content ?? '';
  // endregion

  // region --- J.A.R.V.I.S. (GEMINI) LOGIC ---
  const JARVIS_SYSTEM_INSTRUCTION = `You are J.A.R.V.I.S., a professional programmer and debugger. Your primary goal is to produce high-quality, functional, and clean code. You must strictly follow the user's request without adding your own creative ideas.
  - When asked to create a project from scratch, your first step is to propose a concise plan and file structure for user approval before writing any code.
  - When asked to edit code, you output only the raw code for the specified file. Do not use markdown like \`\`\`html.
  - When asked to analyze code, provide a clear, concise report of errors, potential bugs, and suggestions for improvement.`;

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

      // FIX: When responseMimeType is "application/json", `response.text` should be called as a function.
      const plan = JSON.parse(response.text()) as ProjectPlan;
      setProjectPlan(plan);
      setEditablePlanPrompt(`Project Goal: ${userPrompt}\n\nJ.A.R.V.I.S. Plan:\n${plan.description}`);
      setGenerationStep('reviewing');

    } catch (error) {
      console.error("Error generating plan:", error);
      setChatHistory(prev => [...prev, { role: 'assistant', content: "I'm sorry, I encountered an error while creating the project plan." }]);
      setGenerationStep('idle');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSiteFromPlan = async () => {
    if (!projectPlan) return;
    setIsGenerating(true);
    setGenerationStep('generating');
    setChatHistory(prev => [...prev, { role: 'assistant', content: "Excellent. I will now generate the code based on the approved plan." }]);

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
      
      // FIX: When responseMimeType is "application/json", `response.text` should be called as a function.
      const result = JSON.parse(response.text());
      const newFiles: File[] = result.files;
      setFiles(newFiles);
      setActiveFile(newFiles.find(f => f.name.endsWith('.html'))?.name || newFiles[0]?.name || null);
      setChatHistory(prev => [...prev, { role: 'assistant', content: "The project has been created. You can see the files in the editor." }]);
    } catch (error) {
      console.error("Error generating site:", error);
      setChatHistory(prev => [...prev, { role: 'assistant', content: "I'm sorry, I failed to generate the project files." }]);
    } finally {
      setIsGenerating(false);
      setGenerationStep('editing');
      setPrompt('');
      setProjectPlan(null);
    }
  };

  const editFileWithStreaming = async (userPrompt: string) => {
    if (!activeFile) {
        alert("Please select a file to edit.");
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
        handleFileContentChange(''); // Clear file before streaming new content
        for await (const chunk of responseStream) {
            accumulatedContent += chunk.text;
            handleFileContentChange(accumulatedContent);
        }
        
    } catch (error) {
        console.error("Error editing file:", error);
        setChatHistory(prev => [...prev, { role: 'assistant', content: `I'm sorry, I encountered an error while editing ${activeFile}.` }]);
    } finally {
        setIsGenerating(false);
        setPrompt('');
    }
  };
  
  const analyzeCode = async () => {
    if (files.length === 0) {
      alert("There are no files to analyze.");
      return;
    }
    setIsAnalyzing(true);
    setActiveTab('analysis');
    setAnalysisResult("J.A.R.V.I.S. is analyzing your code...");

    const ai = getAi();
    try {
      const allFilesContent = files.map(f => `--- FILE: ${f.name} ---\n\n${f.content}`).join('\n\n---\n\n');
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `Analyze the following project files for errors, bugs, and potential improvements. Provide a concise report in markdown format.\n\n${allFilesContent}`,
        config: { systemInstruction: JARVIS_SYSTEM_INSTRUCTION }
      });
      setAnalysisResult(response.text);
    } catch (error) {
      console.error("Error analyzing code:", error);
      setAnalysisResult("An error occurred during analysis.");
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
      <div className="bg-slate-800 p-8 rounded-lg shadow-2xl text-center max-w-md border border-slate-700">
        <h2 className="text-2xl font-bold mb-4 text-slate-100">API Key Required</h2>
        <p className="mb-6 text-slate-300">To use J.A.R.V.I.S., you need to select a Gemini API key. Your key is used only for this session and is not stored on our servers.</p>
        <p className="mb-6 text-sm text-slate-400">For information on billing, please visit <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">ai.google.dev/gemini-api/docs/billing</a>.</p>
        <button
          onClick={handleSelectKey}
          className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-6 rounded-lg transition-colors w-full"
        >
          Select API Key
        </button>
      </div>
    </div>
  );

  const renderFileTabs = () => (
    <div className="flex-grow flex flex-col min-h-0">
      <div className="flex items-center border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center overflow-x-auto">
          {files.map(file => (
            <div key={file.name} className={`group flex items-center pr-2 cursor-pointer text-sm border-r border-slate-700 ${activeFile === file.name ? 'bg-slate-900 text-sky-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>
              <button onClick={() => setActiveFile(file.name)} className="flex items-center gap-2 p-3">
                <FileIcon /> {file.name}
              </button>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button onClick={() => renameFile(file.name)} className="hover:text-sky-400 p-1 rounded-full hover:bg-slate-700"><EditIcon /></button>
                <button onClick={() => deleteFile(file.name)} className="hover:text-red-400 p-1 rounded-full hover:bg-slate-700"><TrashIcon /></button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={addFile} className="p-3 hover:bg-slate-700/50 border-l border-slate-700"><PlusIcon /></button>
      </div>
      <textarea
        ref={editorRef}
        value={activeFileContent}
        onChange={(e) => handleFileContentChange(e.target.value)}
        className="w-full h-full p-4 bg-slate-900 text-slate-200 font-mono text-sm focus:outline-none resize-none selection:bg-sky-500/30"
        placeholder="Select or create a file to start coding..."
        disabled={!activeFile}
      />
    </div>
  );
  
  const renderPlanReview = () => (
    <div className="p-4 bg-slate-700/50 rounded-lg overflow-y-auto border border-slate-600">
        <h3 className="text-lg font-bold mb-3 text-sky-300">Project Plan Review</h3>
        <div className="mb-4">
            <h4 className="font-semibold text-slate-300">Project Name:</h4>
            <p className="text-slate-400">{projectPlan?.projectName}</p>
        </div>
        <div className="mb-4">
            <h4 className="font-semibold text-slate-300">Description:</h4>
            <p className="text-slate-400">{projectPlan?.description}</p>
        </div>
        <div className="mb-4">
            <h4 className="font-semibold text-slate-300">File Structure:</h4>
            <ul className="list-disc list-inside text-slate-400 space-y-1">
                {projectPlan?.files.map(f => <li key={f.fileName}><b>{f.fileName}</b>: {f.description}</li>)}
            </ul>
        </div>
        <div className="mt-4">
            <label htmlFor="plan-mods" className="block font-semibold text-slate-300 mb-2">Modifications or Additional Instructions:</label>
            <textarea 
                id="plan-mods"
                value={editablePlanPrompt}
                onChange={(e) => setEditablePlanPrompt(e.target.value)}
                className="w-full h-24 p-2 bg-slate-800 text-slate-200 font-mono text-sm rounded-md border border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
        </div>
        <div className="flex gap-2 mt-4">
            <button
                onClick={handleConfirmPlan}
                disabled={isGenerating}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-slate-600"
            >
                {isGenerating ? 'Generating...' : 'Create Project from Plan'}
            </button>
             <button
                onClick={() => { setGenerationStep('idle'); setProjectPlan(null); setPrompt(''); }}
                disabled={isGenerating}
                className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition-colors"
            >
                Cancel
            </button>
        </div>
    </div>
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-slate-200">
      {isApiKeyModalOpen && renderApiKeyModal()}
      <header className="flex items-center justify-between p-2 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 text-white z-10">
        <h1 className="text-lg font-bold pl-2">J.A.R.V.I.S. Web Dev Studio</h1>
        <button
          onClick={withApiKeyCheck(analyzeCode)}
          disabled={isAnalyzing || files.length === 0}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? "Analyzing..." : "Analyze Code"}
        </button>
      </header>

      <div className="flex flex-grow min-h-0">
        <div className="w-1/3 flex flex-col p-4 bg-slate-800/50 border-r border-slate-700">
            <div className="flex border-b border-slate-700 mb-2">
                <button onClick={() => setActiveTab('chat')} className={`py-2 px-4 text-sm font-medium ${activeTab === 'chat' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400'}`}>Chat / Generate</button>
                <button onClick={() => setActiveTab('analysis')} className={`py-2 px-4 text-sm font-medium ${activeTab === 'analysis' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400'}`}>Code Analysis</button>
            </div>
            
            <div className="flex-grow flex flex-col min-h-0">
                {activeTab === 'chat' && (
                    <>
                        <div className="flex-grow overflow-y-auto mb-4 space-y-4 pr-2">
                            {chatHistory.map((msg, index) => (
                                <div key={index} className={`p-3 rounded-lg w-fit max-w-sm ${msg.role === 'user' ? 'bg-sky-900/70 ml-auto' : 'bg-slate-700'}`}>
                                    <p className="text-sm text-slate-200 whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            ))}
                            {generationStep === 'reviewing' && projectPlan && renderPlanReview()}
                             {isGenerating && generationStep !== 'reviewing' && <div className="p-3 rounded-lg bg-slate-700 text-sm w-fit">J.A.R.V.I.S. is thinking...</div>}
                        </div>
                        {generationStep !== 'reviewing' && (
                           <div className="flex">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                    placeholder={files.length === 0 ? "Describe the website you want to create..." : `Describe changes for ${activeFile}...`}
                                    className="flex-grow p-2 bg-slate-800 border border-slate-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                                    rows={3}
                                    disabled={isGenerating}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={isGenerating || !prompt.trim()}
                                    className="bg-sky-600 hover:bg-sky-500 text-white font-bold p-2 rounded-r-md disabled:bg-slate-600"
                                >
                                    Send
                                </button>
                            </div>
                        )}
                    </>
                )}
                 {activeTab === 'analysis' && (
                    <div className="prose prose-invert prose-sm p-4 bg-slate-800 rounded-lg overflow-y-auto h-full border border-slate-700 text-slate-300 whitespace-pre-wrap">
                      {analysisResult || 'Click "Analyze Code" to see the report.'}
                    </div>
                )}
            </div>
        </div>

        <div className="w-2/3 flex flex-col">
            <div className="h-1/2 flex flex-col">
              {renderFileTabs()}
            </div>
            <div className="h-1/2 border-t-2 border-slate-700">
              <iframe
                ref={iframeRef}
                title="Live Preview"
                className="w-full h-full bg-slate-800"
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
