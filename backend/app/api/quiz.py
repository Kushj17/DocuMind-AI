import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.quiz import Quiz, QuizQuestion
from app.services.document_service import get_document_by_id
from app.services.quiz_service import generate_quiz as gen_quiz, submit_quiz_answers
from app.schemas.quiz import (
    QuizGenerateRequest, QuizResponse, QuizQuestionResponse, QuizSubmitRequest
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/documents/{document_id}/quiz", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
async def generate_quiz_endpoint(
    document_id: str,
    request: QuizGenerateRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a quiz from a document."""
    document = get_document_by_id(db, document_id, str(current_user.id))
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if document.status != "ready":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is not yet processed"
        )
    
    num_questions = request.num_questions if request else 5
    difficulty = request.difficulty if request else "medium"
    
    try:
        quiz = await gen_quiz(
            db=db,
            document=document,
            user_id=str(current_user.id),
            num_questions=num_questions,
            difficulty=difficulty
        )
        
        # Load questions
        questions = db.query(QuizQuestion).filter(
            QuizQuestion.quiz_id == quiz.id
        ).all()
        
        return {
            "id": str(quiz.id),
            "title": quiz.title,
            "score": quiz.score,
            "total_questions": quiz.total_questions,
            "created_at": quiz.created_at,
            "questions": [
                {
                    "id": str(q.id),
                    "question": q.question,
                    "option_a": q.option_a,
                    "option_b": q.option_b,
                    "option_c": q.option_c,
                    "option_d": q.option_d,
                    "correct_answer": None,  # Don't reveal before submission
                    "user_answer": None,
                    "explanation": None
                }
                for q in questions
            ]
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Quiz generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate quiz. Please try again."
        )


@router.get("/quiz/{quiz_id}", response_model=QuizResponse)
def get_quiz(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a quiz."""
    import uuid
    quiz = db.query(Quiz).filter(
        Quiz.id == uuid.UUID(quiz_id),
        Quiz.user_id == current_user.id
    ).first()
    
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
    
    questions = db.query(QuizQuestion).filter(
        QuizQuestion.quiz_id == quiz.id
    ).all()
    
    show_answers = quiz.score is not None  # Show answers only after submission
    
    return {
        "id": str(quiz.id),
        "title": quiz.title,
        "score": quiz.score,
        "total_questions": quiz.total_questions,
        "created_at": quiz.created_at,
        "questions": [
            {
                "id": str(q.id),
                "question": q.question,
                "option_a": q.option_a,
                "option_b": q.option_b,
                "option_c": q.option_c,
                "option_d": q.option_d,
                "correct_answer": q.correct_answer if show_answers else None,
                "user_answer": q.user_answer,
                "explanation": q.explanation if show_answers else None
            }
            for q in questions
        ]
    }


@router.post("/quiz/{quiz_id}/submit", response_model=QuizResponse)
def submit_quiz(
    quiz_id: str,
    request: QuizSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit quiz answers and get score."""
    import uuid
    quiz = db.query(Quiz).filter(
        Quiz.id == uuid.UUID(quiz_id),
        Quiz.user_id == current_user.id
    ).first()
    
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
    
    if quiz.score is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quiz has already been submitted"
        )
    
    quiz = submit_quiz_answers(db, quiz, request.answers)
    
    questions = db.query(QuizQuestion).filter(
        QuizQuestion.quiz_id == quiz.id
    ).all()
    
    return {
        "id": str(quiz.id),
        "title": quiz.title,
        "score": quiz.score,
        "total_questions": quiz.total_questions,
        "created_at": quiz.created_at,
        "questions": [
            {
                "id": str(q.id),
                "question": q.question,
                "option_a": q.option_a,
                "option_b": q.option_b,
                "option_c": q.option_c,
                "option_d": q.option_d,
                "correct_answer": q.correct_answer,
                "user_answer": q.user_answer,
                "explanation": q.explanation
            }
            for q in questions
        ]
    }
