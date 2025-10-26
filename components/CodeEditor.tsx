
import React from 'react';

interface CodeEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ content, onChange }) => {
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
