
import React, { useState, useRef, useEffect } from 'react';
import { CodeFile } from '../types';
import { PlusIcon, XIcon } from './icons';

interface FileTabsProps {
  files: CodeFile[];
  activeFileId: string;
  onAddFile: () => void;
  onSelectFile: (id: string) => void;
  onRemoveFile: (id: string) => void;
  onRenameFile: (id: string, newName: string) => void;
}

export const FileTabs: React.FC<FileTabsProps> = ({
  files,
  activeFileId,
  onAddFile,
  onSelectFile,
  onRemoveFile,
  onRenameFile,
}) => {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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
