import React, { useEffect, useState, useCallback } from 'react';
import MainLayout from '../layouts/MainLayout';
import { documents as documentsApi } from '../services/api';
import { Document } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { DocumentCard } from '../components/DocumentCard';
import { SummaryModal } from '../components/SummaryModal';
import { UploadCloud, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Summary modal state
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  const navigate = useNavigate();

  const fetchDocuments = useCallback(async () => {
    try {
      const data = await documentsApi.getDocuments().then(r => r.data);
      setDocuments(data.documents);
    } catch (error) {
      toast.error('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    // Poll for status updates if any docs are processing
    const interval = setInterval(() => {
      setDocuments(prev => {
        if (prev.some(d => d.status === 'processing')) {
          fetchDocuments();
        }
        return prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchDocuments]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await documentsApi.uploadDocument(file).then(r => r.data);
      toast.success('Document uploaded successfully');
      fetchDocuments();
    } catch (error) {
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!window.confirm(`Are you sure you want to delete "${doc.filename}"?`)) return;
    try {
      await documentsApi.deleteDocument(doc.id).then(r => r.data);
      toast.success('Document deleted');
      setDocuments(documents.filter(d => d.id !== doc.id));
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const filteredDocs = documents.filter(d => d.filename.toLowerCase().includes(search.toLowerCase()));

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
          
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search documents..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Upload Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 bg-gray-50 flex flex-col items-center justify-center text-center hover:bg-gray-100 transition relative">
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileUpload}
            disabled={uploading}
            accept=".pdf,.txt,.doc,.docx"
          />
          <div className="p-4 bg-primary-100 text-primary-600 rounded-full mb-4">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Click or drag file to this area to upload</h3>
          <p className="text-sm text-gray-500 mt-2">Support for a single or bulk upload. Strictly prohibit from uploading company data or other band files.</p>
          {uploading && (
            <div className="mt-4 flex items-center text-primary-600">
              <LoadingSpinner /> <span className="ml-2">Uploading...</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-12"><LoadingSpinner /></div>
        ) : filteredDocs.length === 0 ? (
          <EmptyState 
            title={search ? 'No documents found' : 'No documents yet'}
            description={search ? `No results for "${search}"` : 'Upload your first document to start analyzing.'}
            icon={<UploadCloud className="w-12 h-12 text-gray-300" />}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDocs.map(doc => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onDelete={handleDelete}
                onChat={(doc) => navigate(`/chat?doc=${doc.id}`)}
                onSummary={(doc) => { setSelectedDoc(doc); setSummaryModalOpen(true); }}
                onQuiz={(doc) => navigate(`/quiz/generate/${doc.id}`)} // Or open a generic quiz generation modal, handle routing as per your structure
              />
            ))}
          </div>
        )}
      </div>

      {selectedDoc && (
        <SummaryModal
          isOpen={summaryModalOpen}
          onClose={() => { setSummaryModalOpen(false); setSelectedDoc(null); }}
          documentId={selectedDoc.id}
          documentName={selectedDoc.filename}
        />
      )}
    </MainLayout>
  );
};

export default DocumentsPage;
