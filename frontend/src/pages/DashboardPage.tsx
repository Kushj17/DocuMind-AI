import React, { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import { dashboard, documents, chat } from '../services/api';
import { DashboardStats, Document, Conversation } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { FileText, MessageSquare, BrainCircuit, TrendingUp, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { StatusBadge } from '../components/StatusBadge';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);
  const [recentConvos, setRecentConvos] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, docsData, convosData] = await Promise.all([
          dashboard.getStats().then(r => r.data),
          documents.getDocuments().then(r => r.data),
          chat.getHistory().then(r => r.data)
        ]);
        setStats(statsData);
        setRecentDocs(docsData.documents.slice(0, 5));
        setRecentConvos(convosData.slice(0, 5));
      } catch (error) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <MainLayout><LoadingSpinner /></MainLayout>;

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={<FileText className="text-blue-600 w-6 h-6" />} label="Total Documents" value={stats?.total_documents ?? 0} color="border-blue-500" />
          <StatCard icon={<MessageSquare className="text-green-600 w-6 h-6" />} label="Questions Asked" value={stats?.total_messages ?? 0} color="border-green-500" />
          <StatCard icon={<BrainCircuit className="text-purple-600 w-6 h-6" />} label="Total Quizzes" value={stats?.total_quizzes ?? 0} color="border-purple-500" />
          <StatCard icon={<TrendingUp className="text-amber-600 w-6 h-6" />} label="Avg Quiz Score" value={`${stats?.avg_quiz_score ?? 0}%`} color="border-amber-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Documents */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center"><Clock className="w-5 h-5 mr-2 text-gray-500"/> Recent Documents</h2>
              <Link to="/documents" className="text-primary-600 hover:text-primary-700 text-sm font-medium">View all</Link>
            </div>
            {recentDocs.length === 0 ? (
              <EmptyState title="No documents yet" description="Upload your first document to get started." icon={<FileText className="w-12 h-12 text-gray-300" />} />
            ) : (
              <div className="space-y-4">
                {recentDocs.map(doc => (
                  <div key={doc.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{doc.filename}</p>
                        <p className="text-xs text-gray-500">{new Date(doc.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <StatusBadge status={doc.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Conversations */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center"><MessageSquare className="w-5 h-5 mr-2 text-gray-500"/> Recent Conversations</h2>
              <Link to="/chat" className="text-primary-600 hover:text-primary-700 text-sm font-medium">View all</Link>
            </div>
            {recentConvos.length === 0 ? (
              <EmptyState title="No conversations" description="Start a chat to see history." icon={<MessageSquare className="w-12 h-12 text-gray-300" />} />
            ) : (
              <div className="space-y-4">
                {recentConvos.map(convo => (
                  <Link key={convo.id} to={`/chat/${convo.id}`} className="block">
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <div className="flex items-center space-x-3">
                        <MessageSquare className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900 line-clamp-1">{convo.title}</p>
                          <p className="text-xs text-gray-500">{new Date(convo.updated_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-l-4 ${color} flex items-center space-x-4`}>
    <div className="p-3 bg-gray-50 rounded-lg">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

export default DashboardPage;
