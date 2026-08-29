import React from 'react';
import { Source } from '../types';
import { FileText } from 'lucide-react';

export const SourceCitation: React.FC<{ sources: Source[] }> = ({ sources }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
      <p className="text-xs font-semibold mb-2 opacity-80">Sources:</p>
      <div className="flex flex-wrap gap-2">
        {sources.map((source, idx) => (
          <div key={idx} className="flex items-center bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded px-2 py-1 text-xs border border-gray-200 dark:border-gray-600">
            <FileText className="w-3 h-3 mr-1" />
            <span className="truncate max-w-[150px]">{source.document_name}</span>
            {source.page && <span className="ml-1">— Page {source.page}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};
