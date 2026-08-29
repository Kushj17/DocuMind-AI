import React, { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import { quiz as quizApi } from '../services/api';
import { Quiz, QuizQuestion } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';

export const QuizPage: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // Using 'id' for existing quiz, or 'generate/:docId' handled differently
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  
  // For generation route: /quiz/generate/:docId
  const isGenerateRoute = window.location.pathname.includes('/generate/');
  const docId = isGenerateRoute ? id : null;

  useEffect(() => {
    if (isGenerateRoute && docId) {
      generateNewQuiz(docId);
    } else if (id) {
      fetchQuiz(id);
    }
  }, [id, isGenerateRoute, docId]);

  const generateNewQuiz = async (documentId: string) => {
    setLoading(true);
    try {
      const newQuiz = await quizApi.generateQuiz(documentId, 5, 'medium').then(r => r.data);
      // Redirect to the actual quiz URL
      navigate(`/quiz/${newQuiz.id}`, { replace: true });
    } catch (error) {
      toast.error('Failed to generate quiz');
      navigate('/documents');
    }
  };

  const fetchQuiz = async (quizId: string) => {
    try {
      const data = await quizApi.getQuiz(quizId).then(r => r.data);
      setQuiz(data);
      if (data.score !== undefined && data.score !== null) {
        setSubmitted(true);
        setScore(data.score);
        // Pre-fill answers if available (depends on API)
      }
    } catch (error) {
      toast.error('Failed to fetch quiz');
      navigate('/documents');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (questionId: string, answer: string) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < quiz.questions.length) {
      if (!window.confirm(`You have only answered ${answeredCount}/${quiz.questions.length} questions. Submit anyway?`)) return;
    }

    setSubmitting(true);
    try {
      // Assuming api.quiz.submitQuiz returns score and correct answers, update to match your API
      const res = await quizApi.submitQuiz(quiz.id, answers).then(r => r.data);
      setScore(res.score);
      setSubmitted(true);
      // Fetch quiz again to get correct answers if they are included in the response or reload
      await fetchQuiz(quiz.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      toast.error('Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <MainLayout><LoadingSpinner /></MainLayout>;
  if (!quiz) return <MainLayout><div className="text-center mt-20 text-gray-500">Quiz not found</div></MainLayout>;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center space-x-4">
          <button onClick={() => navigate('/documents')} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quiz</h1>
            <p className="text-sm text-gray-500 mt-1">Test your knowledge on the document content.</p>
          </div>
        </div>

        {submitted && score !== null && (
          <div className="mb-8 p-6 bg-primary-50 rounded-xl border border-primary-100 flex flex-col items-center justify-center text-center shadow-sm">
            <h2 className="text-2xl font-bold text-primary-900 mb-2">Quiz Completed!</h2>
            <div className="text-5xl font-extrabold text-primary-600 mb-2">{score.toFixed(0)}%</div>
            <p className="text-primary-800">
              You scored {Math.round((score / 100) * quiz.questions.length)} out of {quiz.questions.length} correct.
            </p>
          </div>
        )}

        <div className="space-y-8">
          {quiz.questions.map((q, index) => (
            <div key={q.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                <span className="text-primary-600 mr-2">{index + 1}.</span> {q.question}
              </h3>
              <div className="space-y-3">
                {[
                  { key: 'a', text: q.option_a },
                  { key: 'b', text: q.option_b },
                  { key: 'c', text: q.option_c },
                  { key: 'd', text: q.option_d }
                ].filter(opt => opt.text).map(({ key, text: optionText }) => {
                  const isSelected = answers[q.id] === key;
                  const isCorrect = q.correct_answer === key;
                  
                  let optionClass = "border-gray-200 hover:border-primary-300";
                  if (isSelected && !submitted) optionClass = "border-primary-500 bg-primary-50 ring-2 ring-primary-200";
                  
                  if (submitted) {
                    if (isCorrect) {
                      optionClass = "border-green-500 bg-green-50";
                    } else if (isSelected && !isCorrect) {
                      optionClass = "border-red-500 bg-red-50";
                    } else {
                      optionClass = "border-gray-200 opacity-50";
                    }
                  }

                  return (
                    <label
                      key={key}
                      className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all ${optionClass}`}
                    >
                      <div className="flex items-center h-5">
                        <input
                          type="radio"
                          name={`question-${q.id}`}
                          value={key}
                          checked={isSelected}
                          onChange={() => handleSelectAnswer(q.id, key)}
                          disabled={submitted}
                          className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500 disabled:opacity-50"
                        />
                      </div>
                      <div className="ml-3 flex-1 flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900">
                          <span className="uppercase mr-2 text-gray-500">{key})</span> {String(optionText)}
                        </span>
                        {submitted && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />}
                        {submitted && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
                      </div>
                    </label>
                  );
                })}
              </div>
              
              {submitted && q.explanation && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm text-blue-900"><span className="font-semibold">Explanation:</span> {q.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {!submitted && (
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-primary-600 text-white rounded-lg px-8 py-3 font-medium hover:bg-primary-700 transition disabled:opacity-50 flex items-center"
            >
              {submitting ? <><LoadingSpinner /> <span className="ml-2">Submitting...</span></> : 'Submit Quiz'}
            </button>
          </div>
        )}
        
        {submitted && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => navigate('/documents')}
              className="bg-gray-100 text-gray-800 rounded-lg px-8 py-3 font-medium hover:bg-gray-200 transition"
            >
              Back to Documents
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default QuizPage;
