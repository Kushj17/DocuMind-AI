import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const auth = {
  register: (name: string, email: string, password: string) => 
    api.post('/auth/register', { name, email, password }),
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
  getMe: () => 
    api.get('/auth/me')
};

export const documents = {
  getDocuments: () => api.get('/documents'),
  getDocument: (id: string) => api.get(`/documents/${id}`),
  uploadDocument: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/documents/upload', formData);
  },
  deleteDocument: (id: string) => api.delete(`/documents/${id}`),
  getSummary: (id: string, length: string = 'medium') => 
    api.post(`/documents/${id}/summary`, { length })
};

export const chat = {
  sendMessage: (question: string, documentIds: string[], conversationId?: string) => 
    api.post('/chat', { question, document_ids: documentIds, conversation_id: conversationId }),
  getHistory: () => api.get('/chat/history'),
  getConversation: (id: string) => api.get(`/chat/${id}`),
  deleteConversation: (id: string) => api.delete(`/chat/${id}`)
};

export const quiz = {
  generateQuiz: (documentId: string, numQuestions: number, difficulty: string) => 
    api.post(`/documents/${documentId}/quiz`, { num_questions: numQuestions, difficulty }),
  getQuiz: (id: string) => api.get(`/quiz/${id}`),
  submitQuiz: (id: string, answers: Record<string, string>) => 
    api.post(`/quiz/${id}/submit`, { answers })
};

export const dashboard = {
  getStats: () => api.get('/dashboard')
};

export default api;
