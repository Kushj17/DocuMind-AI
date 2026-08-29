from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.document import Document
from app.models.conversation import Conversation, Message
from app.models.quiz import Quiz
from app.schemas.dashboard import DashboardStats

router = APIRouter()


@router.get("", response_model=DashboardStats)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get dashboard statistics."""
    user_id = current_user.id
    
    total_documents = db.query(Document).filter(Document.user_id == user_id).count()
    total_conversations = db.query(Conversation).filter(Conversation.user_id == user_id).count()
    
    # Count messages in user's conversations
    total_messages = db.query(Message).join(Conversation).filter(
        Conversation.user_id == user_id,
        Message.role == "user"
    ).count()
    
    total_quizzes = db.query(Quiz).filter(Quiz.user_id == user_id).count()
    
    # Average quiz score
    avg_score = db.query(func.avg(Quiz.score)).filter(
        Quiz.user_id == user_id,
        Quiz.score.isnot(None)
    ).scalar()
    
    # Recent documents
    recent_docs = db.query(Document).filter(
        Document.user_id == user_id
    ).order_by(Document.created_at.desc()).limit(5).all()
    
    # Recent conversations
    recent_convs = db.query(Conversation).filter(
        Conversation.user_id == user_id
    ).order_by(Conversation.updated_at.desc()).limit(5).all()
    
    return {
        "total_documents": total_documents,
        "total_conversations": total_conversations,
        "total_messages": total_messages,
        "total_quizzes": total_quizzes,
        "avg_quiz_score": round(avg_score, 1) if avg_score else None,
        "recent_documents": recent_docs,
        "recent_conversations": recent_convs
    }
