from pydantic import BaseModel

class SummaryRequest(BaseModel):
    length: str = 'medium'  # 'short', 'medium', 'detailed'

class SummaryResponse(BaseModel):
    summary: str
    document_name: str
