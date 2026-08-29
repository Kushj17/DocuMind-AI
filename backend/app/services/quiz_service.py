import json
import logging
import uuid
from sqlalchemy.orm import Session
from app.models.document import Document, DocumentChunk
from app.models.quiz import Quiz, QuizQuestion
from app.services.ai_service import get_ai_service

logger = logging.getLogger(__name__)


async def generate_quiz(
    db: Session,
    document: Document,
    user_id: str,
    num_questions: int = 5,
    difficulty: str = "medium"
) -> Quiz:
    """Generate a quiz from document content."""
    ai_service = get_ai_service()
    
    # Get document chunks
    chunks = db.query(DocumentChunk).filter(
        DocumentChunk.document_id == document.id
    ).order_by(DocumentChunk.page_number, DocumentChunk.chunk_index).all()
    
    if not chunks:
        raise ValueError("No text content found in this document.")
    
    # Select representative content
    max_chunks = 15
    if len(chunks) > max_chunks:
        step = len(chunks) // max_chunks
        selected = chunks[::step][:max_chunks]
    else:
        selected = chunks
    
    content = "\n\n".join([c.text for c in selected])
    if len(content) > 12000:
        content = content[:12000]
    
    prompt = f"""Generate exactly {num_questions} multiple choice questions from the following document content.
Difficulty level: {difficulty}

Document: {document.original_filename}

Content:
{content}

Return a JSON array with exactly {num_questions} questions. Each question must have this exact format:
[
  {{
    "question": "The question text?",
    "option_a": "First option",
    "option_b": "Second option",
    "option_c": "Third option",
    "option_d": "Fourth option",
    "correct_answer": "a",
    "explanation": "Brief explanation of why this is correct."
  }}
]

Rules:
- Questions must be based ONLY on the provided content
- correct_answer must be one of: "a", "b", "c", "d"
- Make options plausible but only one correct
- Difficulty: easy = recall, medium = understanding, hard = analysis
- Return ONLY the JSON array, no other text"""
    
    system_prompt = "You are a quiz generator. Generate questions based only on the provided content. Return valid JSON only."
    
    response = await ai_service.generate_text(
        prompt=prompt,
        system_prompt=system_prompt
    )
    
    # Parse the JSON response
    try:
        # Clean up response - remove markdown code blocks if present
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]  # Remove first line
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
        
        questions_data = json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse quiz JSON: {e}")
        logger.error(f"Response was: {response[:500]}")
        raise ValueError("Failed to generate quiz questions. Please try again.")
    
    # Create quiz
    import uuid
    quiz = Quiz(
        user_id=uuid.UUID(user_id) if isinstance(user_id, str) else user_id,
        document_id=document.id,
        title=f"Quiz: {document.original_filename}",
        total_questions=len(questions_data)
    )
    db.add(quiz)
    db.flush()
    
    # Create questions
    for q_data in questions_data:
        question = QuizQuestion(
            quiz_id=quiz.id,
            question=q_data.get("question", ""),
            option_a=q_data.get("option_a", ""),
            option_b=q_data.get("option_b", ""),
            option_c=q_data.get("option_c", ""),
            option_d=q_data.get("option_d", ""),
            correct_answer=q_data.get("correct_answer", "a").lower(),
            explanation=q_data.get("explanation", "")
        )
        db.add(question)
    
    db.commit()
    db.refresh(quiz)
    
    return quiz


def submit_quiz_answers(
    db: Session,
    quiz: Quiz,
    answers: dict[str, str]
) -> Quiz:
    """Submit answers and calculate score."""
    questions = db.query(QuizQuestion).filter(
        QuizQuestion.quiz_id == quiz.id
    ).all()
    
    correct = 0
    total = len(questions)
    
    for question in questions:
        user_answer = answers.get(str(question.id))
        if user_answer:
            question.user_answer = user_answer.lower()
            if question.user_answer == question.correct_answer:
                correct += 1
    
    quiz.score = (correct / total * 100) if total > 0 else 0
    db.commit()
    db.refresh(quiz)
    
    return quiz
