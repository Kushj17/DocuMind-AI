from pydantic import BaseModel
from app.schemas.document import DocumentResponse
from app.schemas.conversation import ConversationResponse

class DashboardStats(BaseModel):
    total_documents: int
    total_conversations: int
    total_messages: int
    total_quizzes: int
    avg_quiz_score: float | None = None
    recent_documents: list[DocumentResponse] = []
    recent_conversations: list[ConversationResponse] = []
