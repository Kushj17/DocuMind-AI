from pydantic import BaseModel, ConfigDict
from datetime import datetime
import uuid

class QuizGenerateRequest(BaseModel):
    num_questions: int = 5
    difficulty: str = 'medium'

class QuizQuestionResponse(BaseModel):
    id: uuid.UUID
    question: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str | None = None
    explanation: str | None = None
    user_answer: str | None = None

    model_config = ConfigDict(from_attributes=True)

class QuizResponse(BaseModel):
    id: uuid.UUID
    title: str
    score: float | None = None
    total_questions: int
    created_at: datetime
    questions: list[QuizQuestionResponse] = []

    model_config = ConfigDict(from_attributes=True)

class QuizSubmitRequest(BaseModel):
    answers: dict[str, str]
