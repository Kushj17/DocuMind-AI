import React from 'react';
import { Document } from '../types';
import { StatusBadge } from './StatusBadge';
import { FileText, MessageSquare, BrainCircuit, FileSignature, Trash2 } from 'lucide-react';

interface DocumentCardProps {
  document: Document;
  onChat: (doc: Document) => void;
  onSummary: (doc: Document) => void;
  onQuiz: (doc: Document) => void;
  onDelete: (doc: Document) => void;
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const DocumentCard: React.FC<DocumentCardProps> = ({ document, onChat, onSummary, onQuiz, onDelete }) => {
  const isReady = document.status.toLowerCase() === 'ready';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col transition hover:shadow-md">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3 truncate">
          <div className="bg-primary-50 p-2 rounded-lg text-primary-600 flex-shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div className="truncate">
            <h3 className="text-sm font-semibold text-gray-900 truncate" title={document.filename}>{document.filename}</h3>
            <p className="text-xs text-gray-500 mt-1">
              {formatBytes(document.file_size || 0)} • {new Date(document.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <StatusBadge status={document.status} />
      </div>

      <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => onChat(document)}
            disabled={!isReady}
            className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Chat with document"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSummary(document)}
            disabled={!isReady}
            className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Generate Summary"
          >
            <FileSignature className="w-4 h-4" />
          </button>
          <button
            onClick={() => onQuiz(document)}
            disabled={!isReady}
            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Take a Quiz"
          >
            <BrainCircuit className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => onDelete(document)}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
          title="Delete document"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
