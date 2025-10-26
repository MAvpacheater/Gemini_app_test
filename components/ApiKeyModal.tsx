import React, { useState } from 'react';
import { KeyIcon } from './icons.tsx';

interface ApiKeyModalProps {
  onSave: (apiKey: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave }) => {
  const [key, setKey] = useState('');

  const handleSave = () => {
    if (key.trim()) {
      onSave(key.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        handleSave();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-8 max-w-lg w-full m-4">
        <div className="flex items-center mb-4">
          <KeyIcon className="h-8 w-8 text-yellow-400 mr-3 flex-shrink-0" />
          <h2 className="text-2xl font-bold text-white">Введіть ваш API ключ Gemini</h2>
        </div>
        <p className="text-gray-400 mb-6 text-sm">
          Для аналізу коду потрібен ваш власний API ключ Google AI. Додаток не зберігає ваш ключ, він використовується лише для запитів протягом цієї сесії.
        </p>
        <div className="mb-6">
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300 mb-2">
            API Ключ
          </label>
          <input
            id="apiKey"
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Вставте ваш ключ тут..."
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-400 hover:underline"
          >
            Отримати API ключ
          </a>
          <button
            onClick={handleSave}
            disabled={!key.trim()}
            className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed font-semibold transition-colors"
          >
            Зберегти та продовжити
          </button>
        </div>
      </div>
    </div>
  );
};