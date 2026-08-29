import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '../layouts/MainLayout';
import { chat, documents as documentsApi } from '../services/api';
import { Conversation, Document, Message } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { SourceCitation } from '../components/SourceCitation';
import { Send, Plus, MessageSquare, Trash2, ChevronRight, ChevronLeft, Files } from 'lucide-react';
import toast from 'react-hot-toast';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

export const ChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialDocId = searchParams.get('doc');

  const [history, setHistory] = useState<Conversation[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(initialDocId ? [initialDocId] : []);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [docsPanelOpen, setDocsPanelOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHistory();
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      setMessages([]);
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const fetchHistory = async () => {
    try {
      const data = await chat.getHistory().then((r: any) => r.data);
      setHistory(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const data = await documentsApi.getDocuments().then((r: any) => r.data);
      setDocuments(data.documents.filter((d: Document) => d.status.toLowerCase() === 'ready'));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const loadConversation = async (id: string) => {
    try {
      const data = await chat.getConversation(id).then((r: any) => r.data);
      setMessages(data.messages || []);
    } catch (error) {
      toast.error('Failed to load conversation');
      navigate('/chat');
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    if (selectedDocIds.length === 0) {
      toast.error('Please select at least one document to chat with');
      return;
    }

    const question = inputValue.trim();
    setInputValue('');
    
    // Optimistic user message
    const tempUserMsg: Message = { id: 'temp-'+Date.now(), role: 'user', content: question, sources: null, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await chat.sendMessage(question, selectedDocIds, conversationId).then((r: any) => r.data);
      
      // If it's a new conversation, update URL
      if (!conversationId && res.conversation_id) {
        navigate(`/chat/${res.conversation_id}`, { replace: true });
        // The loadConversation will fetch the real messages including AI response
        await loadConversation(res.conversation_id);
        fetchHistory();
      } else {
        // Just append AI message
        const newAiMsg: Message = {
          id: 'ai-'+Date.now(),
          role: 'assistant',
          content: res.answer,
          sources: res.sources,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, newAiMsg]);
      }
    } catch (error) {
      toast.error('Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation?')) return;
    try {
      await chat.deleteConversation(id).then((r: any) => r.data);
      setHistory(prev => prev.filter(c => c.id !== id));
      if (conversationId === id) {
        navigate('/chat');
      }
    } catch (error) {
      toast.error('Failed to delete conversation');
    }
  };

  const toggleDocSelection = (id: string) => {
    setSelectedDocIds(prev => prev.includes(id) ? prev.filter(docId => docId !== id) : [...prev, id]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const currentTitle = conversationId ? history.find(c => c.id === conversationId)?.title || 'Conversation' : 'New Chat';

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-4rem)] -mt-8 -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden bg-white">
        
        {/* Left Sidebar - Chat History */}
        <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={() => navigate('/chat')}
              className="w-full flex items-center justify-center space-x-2 bg-primary-600 text-white rounded-lg px-4 py-2 hover:bg-primary-700 transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {history.map(convo => (
              <div
                key={convo.id}
                onClick={() => navigate(`/chat/${convo.id}`)}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition ${conversationId === convo.id ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-200 text-gray-700'}`}
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate text-sm font-medium">{convo.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(convo.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {history.length === 0 && (
              <div className="text-center text-sm text-gray-500 mt-10">No recent chats</div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Header */}
          <div className="h-14 border-b border-gray-200 px-6 flex items-center justify-between bg-white shadow-sm z-10">
            <h2 className="font-semibold text-gray-800">{currentTitle}</h2>
            <button
              onClick={() => setDocsPanelOpen(!docsPanelOpen)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm transition ${docsPanelOpen ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Files className="w-4 h-4" />
              <span>Docs ({selectedDocIds.length})</span>
            </button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Messages Area */}
            <div className="flex-1 flex flex-col bg-gray-50 relative">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <EmptyState
                      title="Start a new conversation"
                      description="Select documents from the panel and ask questions about them."
                      icon={<MessageSquare className="w-12 h-12 text-gray-300" />}
                    />
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={msg.id || idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-5 py-4 shadow-sm ${msg.role === 'user' ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'}`}>
                        <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                          {msg.content}
                        </div>
                        {msg.role === 'assistant' && msg.sources && (
                          <SourceCitation sources={msg.sources} />
                        )}
                      </div>
                    </div>
                  ))
                )}
                {loading && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm flex space-x-2 items-center">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="max-w-4xl mx-auto relative flex items-end shadow-sm border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Ask a question about your documents..."
                    className="w-full max-h-32 p-4 resize-none focus:outline-none bg-transparent"
                    rows={1}
                    style={{ minHeight: '56px' }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={loading || !inputValue.trim() || selectedDocIds.length === 0}
                    className="m-2 p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                <div className="text-center mt-2">
                  <span className="text-xs text-gray-500">
                    {selectedDocIds.length} document(s) selected
                  </span>
                </div>
              </div>
            </div>

            {/* Document Selector Panel */}
            {docsPanelOpen && (
              <div className="w-72 border-l border-gray-200 bg-white flex flex-col shadow-lg z-20">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                  <h3 className="font-semibold text-gray-800">Select Documents</h3>
                  <button onClick={() => setDocsPanelOpen(false)} className="text-gray-500 hover:text-gray-700">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loadingDocs ? (
                    <LoadingSpinner />
                  ) : documents.length === 0 ? (
                    <div className="text-sm text-gray-500 text-center mt-4">No ready documents found. Upload some first.</div>
                  ) : (
                    documents.map(doc => (
                      <label key={doc.id} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                        <input
                          type="checkbox"
                          checked={selectedDocIds.includes(doc.id)}
                          onChange={() => toggleDocSelection(doc.id)}
                          className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate" title={doc.filename}>{doc.filename}</p>
                          <p className="text-xs text-gray-500">{new Date(doc.created_at).toLocaleDateString()}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ChatPage;
