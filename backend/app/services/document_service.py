import uuid
import os
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import pymupdf  # PyMuPDF

from app.core.config import settings
from app.models.document import Document, DocumentChunk
from app.services.ai_service import get_ai_service
from app.services.chunking_service import chunk_text

logger = logging.getLogger(__name__)


def save_uploaded_file(file_content: bytes, original_filename: str) -> tuple[str, str]:
    """Save uploaded file and return (filename, file_path)."""
    ext = os.path.splitext(original_filename)[1]
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(file_content)
    return filename, file_path


def extract_text_from_pdf(file_path: str) -> list[dict]:
    """Extract text from PDF, returning list of {page_number, text}."""
    pages = []
    try:
        doc = pymupdf.open(file_path)
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text().strip()
            if text:
                pages.append({
                    "page_number": page_num + 1,
                    "text": text
                })
        doc.close()
        return pages
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        raise RuntimeError(f"Failed to extract text from PDF: {str(e)}")


from app.db.session import SessionLocal

async def process_document(document_id: str):
    """Full document processing pipeline: extract text -> chunk -> embed -> store."""
    db = SessionLocal()
    try:
        import uuid
        document = db.query(Document).filter(Document.id == uuid.UUID(document_id)).first()
        if not document:
            logger.error(f"Document {document_id} not found")
            return
        
        # Update status to processing
        document.status = "processing"
        db.commit()
        
        # Step 1: Extract text
        logger.info(f"Extracting text from {document.original_filename}")
        pages = extract_text_from_pdf(document.file_path)
        
        if not pages:
            document.status = "failed"
            db.commit()
            logger.warning(f"No text extracted from {document.original_filename}")
            return
        
        document.page_count = len(pages)
        
        # Step 2: Chunk text
        logger.info(f"Chunking text for {document.original_filename}")
        chunks = []
        for page_data in pages:
            page_chunks = chunk_text(
                page_data["text"],
                chunk_size=settings.CHUNK_SIZE,
                chunk_overlap=settings.CHUNK_OVERLAP
            )
            for idx, chunk_text_content in enumerate(page_chunks):
                chunks.append({
                    "page_number": page_data["page_number"],
                    "chunk_index": idx,
                    "text": chunk_text_content
                })
        
        # Step 3: Generate embeddings
        logger.info(f"Generating embeddings for {len(chunks)} chunks")
        ai_service = get_ai_service()
        texts = [c["text"] for c in chunks]
        embeddings = await ai_service.generate_embeddings_batch(texts)
        
        # Step 4: Store chunks with embeddings
        logger.info(f"Storing {len(chunks)} chunks in database")
        for i, chunk_data in enumerate(chunks):
            db_chunk = DocumentChunk(
                document_id=document.id,
                page_number=chunk_data["page_number"],
                chunk_index=chunk_data["chunk_index"],
                text=chunk_data["text"],
                embedding=embeddings[i] if i < len(embeddings) else None
            )
            db.add(db_chunk)
        
        document.status = "ready"
        document.updated_at = datetime.now(timezone.utc)
        db.commit()
        logger.info(f"Document {document.original_filename} processed successfully")
        
    except Exception as e:
        logger.error(f"Document processing failed for {document_id}: {e}")
        document.status = "failed"
        db.commit()
    finally:
        db.close()


import uuid

def get_user_documents(db: Session, user_id: str | uuid.UUID, skip: int = 0, limit: int = 50) -> list[Document]:
    """Get all documents for a user."""
    uid = user_id if isinstance(user_id, uuid.UUID) else uuid.UUID(str(user_id))
    return db.query(Document).filter(
        Document.user_id == uid
    ).order_by(Document.created_at.desc()).offset(skip).limit(limit).all()


def get_document_count(db: Session, user_id: str | uuid.UUID) -> int:
    """Get document count for a user."""
    uid = user_id if isinstance(user_id, uuid.UUID) else uuid.UUID(str(user_id))
    return db.query(Document).filter(Document.user_id == uid).count()


def get_document_by_id(db: Session, document_id: str | uuid.UUID, user_id: str | uuid.UUID) -> Document | None:
    """Get a specific document, verifying ownership."""
    did = document_id if isinstance(document_id, uuid.UUID) else uuid.UUID(str(document_id))
    uid = user_id if isinstance(user_id, uuid.UUID) else uuid.UUID(str(user_id))
    return db.query(Document).filter(
        Document.id == did,
        Document.user_id == uid
    ).first()


def delete_document(db: Session, document: Document):
    """Delete document and its file."""
    try:
        if os.path.exists(document.file_path):
            os.remove(document.file_path)
    except OSError as e:
        logger.warning(f"Failed to delete file {document.file_path}: {e}")
    db.delete(document)
    db.commit()
