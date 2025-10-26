import React, { useState } from 'react';
import { AnalysisReport, FileAnalysis } from '../types';
import { SparklesIcon, FileCodeIcon, CodeBracketIcon } from './icons';

interface AnalysisResultProps {
  report: AnalysisReport | null;
  isLoading: boolean;
  error: string | null;
}

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
    const [isCodeVisible, setIsCodeVisible] = useState(false);

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


export const AnalysisResult: React.FC<AnalysisResultProps> = ({ report, isLoading, error }) => {
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