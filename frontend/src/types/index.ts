export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface Document {
  id: string;
  filename: string;
  original_filename: string;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  file_size: number;
  page_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  document_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface Source {
  document_id: string;
  document_name: string;
  page: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: Source[] | null;
  created_at: string;
}

export interface ChatResponse {
  answer: string;
  sources: Source[];
  conversation_id: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer?: string;
  user_answer?: string;
  explanation?: string;
}

export interface Quiz {
  id: string;
  title: string;
  score: number | null;
  total_questions: number;
  created_at: string;
  questions: QuizQuestion[];
}

export interface DashboardStats {
  total_documents: number;
  total_conversations: number;
  total_messages: number;
  total_quizzes: number;
  avg_quiz_score: number | null;
  recent_documents: Document[];
  recent_conversations: Conversation[];
}

export interface SummaryResponse {
  summary: string;
  document_name: string;
}
