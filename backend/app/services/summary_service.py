import logging
from sqlalchemy.orm import Session
from app.models.document import Document, DocumentChunk
from app.services.ai_service import get_ai_service

logger = logging.getLogger(__name__)

SUMMARY_PROMPTS = {
    "short": "Provide a brief 2-3 sentence summary of the following document content.",
    "medium": "Provide a clear and comprehensive summary of the following document content in about 2-3 paragraphs. Cover the main topics and key points.",
    "detailed": "Provide a detailed and thorough summary of the following document content. Cover all major topics, key arguments, important details, and conclusions. Use markdown formatting with headers and bullet points."
}


async def generate_summary(
    db: Session,
    document: Document,
    length: str = "medium"
) -> str:
    """Generate a summary of a document."""
    ai_service = get_ai_service()
    
    # Get document chunks (limit to avoid huge prompts)
    chunks = db.query(DocumentChunk).filter(
        DocumentChunk.document_id == document.id
    ).order_by(DocumentChunk.page_number, DocumentChunk.chunk_index).all()
    
    if not chunks:
        return "No text content found in this document."
    
    # Select representative chunks (first, middle, last sections)
    max_chunks = 20
    if len(chunks) > max_chunks:
        step = len(chunks) // max_chunks
        selected_chunks = chunks[::step][:max_chunks]
    else:
        selected_chunks = chunks
    
    # Build content
    content = "\n\n".join([c.text for c in selected_chunks])
    
    # Limit total content size
    max_chars = 15000
    if len(content) > max_chars:
        content = content[:max_chars] + "\n\n[Content truncated...]"
    
    prompt_instruction = SUMMARY_PROMPTS.get(length, SUMMARY_PROMPTS["medium"])
    
    prompt = f"""{prompt_instruction}

Document: {document.original_filename}

Content:
{content}"""
    
    system_prompt = "You are a document summarization assistant. Summarize accurately based only on the provided content. Do not invent information."
    
    summary = await ai_service.generate_text(
        prompt=prompt,
        system_prompt=system_prompt
    )
    
    return summary
