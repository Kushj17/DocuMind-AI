from pydantic import BaseModel, ConfigDict
from datetime import datetime
import uuid

class DocumentResponse(BaseModel):
    id: uuid.UUID
    filename: str
    original_filename: str
    status: str
    file_size: int
    page_count: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int
