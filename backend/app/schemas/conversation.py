from pydantic import BaseModel, ConfigDict
from datetime import datetime
import uuid

class SourceInfo(BaseModel):
    document_id: str
    document_name: str
    page: int | None = None

class ChatRequest(BaseModel):
    question: str
    document_ids: list[str] = []
    conversation_id: str | None = None

class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceInfo] = []
    conversation_id: str

class MessageResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    sources: list[dict] | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ConversationResponse(BaseModel):
    id: uuid.UUID
    title: str
    document_ids: list[str] | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ConversationDetailResponse(ConversationResponse):
    messages: list[MessageResponse] = []
