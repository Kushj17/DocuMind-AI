import React, { useState } from 'react';
import { documents as documentsApi } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import { X, FileText, Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({ isOpen, onClose, documentId, documentName }) => {
  const [length, setLength] = useState<'short' | 'medium' | 'detailed'>('medium');
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setSummary(null);
    try {
      const response = await documentsApi.getSummary(documentId, length).then(r => r.data);
      setSummary(response.summary);
    } catch (error) {
      toast.error('Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center" id="modal-title">
                <FileText className="w-5 h-5 mr-2 text-primary-600" />
                Summary: {documentName}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500 focus:outline-none">
                <X className="w-6 h-6" />
              </button>
            </div>

            {!summary && !loading && (
              <div className="space-y-4 py-4">
                <p className="text-sm text-gray-600">Select the desired length for the summary:</p>
                <div className="flex space-x-4">
                  {(['short', 'medium', 'detailed'] as const).map((l) => (
                    <label key={l} className={`flex-1 cursor-pointer border rounded-lg p-4 flex flex-col items-center justify-center transition-all ${length === l ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200' : 'border-gray-200 hover:border-primary-300'}`}>
                      <input type="radio" className="sr-only" checked={length === l} onChange={() => setLength(l)} />
                      <span className="font-medium text-gray-900 capitalize">{l}</span>
                    </label>
                  ))}
                </div>
                <div className="pt-4 flex justify-end">
                  <button onClick={handleGenerate} className="bg-primary-600 text-white rounded-lg px-6 py-2 hover:bg-primary-700 transition">
                    Generate Summary
                  </button>
                </div>
              </div>
            )}

            {loading && (
              <div className="py-12 flex flex-col items-center justify-center">
                <LoadingSpinner />
                <p className="mt-4 text-sm text-gray-500 animate-pulse">Analyzing document and generating summary...</p>
              </div>
            )}

            {summary && !loading && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-5 max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm text-gray-800 border border-gray-200">
                  {summary}
                </div>
                <div className="flex justify-between items-center pt-2">
                  <button onClick={() => setSummary(null)} className="text-sm text-gray-500 hover:text-gray-700">
                    Generate Another
                  </button>
                  <button onClick={onClose} className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 hover:bg-gray-200 transition">
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
