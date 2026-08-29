import logging
from sqlalchemy.orm import Session
from sqlalchemy import text as sql_text

from app.core.config import settings
from app.models.document import Document, DocumentChunk
from app.models.conversation import Conversation, Message
from app.services.ai_service import get_ai_service

logger = logging.getLogger(__name__)

RAG_SYSTEM_PROMPT = """You are DocuMind, an AI assistant that answers questions based on uploaded documents.

IMPORTANT RULES:
1. Answer ONLY based on the provided document context below.
2. Do NOT make up or invent any information.
3. If the answer cannot be found in the provided context, say: "I couldn't find information about this in the uploaded documents."
4. When referencing information, mention which document and page it came from.
5. Be concise but thorough.
6. Use markdown formatting for better readability.

DOCUMENT CONTEXT:
{context}
"""

CONVERSATION_SYSTEM_PROMPT = """Previous conversation for context:
{history}
"""


import numpy as np

def cosine_similarity(v1, v2):
    dot_product = np.dot(v1, v2)
    norm_v1 = np.linalg.norm(v1)
    norm_v2 = np.linalg.norm(v2)
    if norm_v1 == 0 or norm_v2 == 0:
        return 0.0
    return dot_product / (norm_v1 * norm_v2)

async def search_similar_chunks(
    db: Session,
    query_embedding: list[float],
    document_ids: list[str],
    top_k: int = 5
) -> list[DocumentChunk]:
    """Search for similar chunks."""
    import uuid
    uuid_doc_ids = [uuid.UUID(d) if isinstance(d, str) else d for d in document_ids]
    
    if settings.DATABASE_URL.startswith("sqlite"):
        try:
            # Python-based memory search for SQLite
            logger.info("Using python memory vector search for SQLite")
            chunks = db.query(DocumentChunk).filter(
                DocumentChunk.document_id.in_(uuid_doc_ids),
                DocumentChunk.embedding.isnot(None)
            ).all()
            
            if not chunks:
                return []
                
            query_vec = np.array(query_embedding)
            scored_chunks = []
            
            for chunk in chunks:
                try:
                    if isinstance(chunk.embedding, str):
                        import json
                        chunk_vec = np.array(json.loads(chunk.embedding))
                    else:
                        chunk_vec = np.array(chunk.embedding)
                    
                    sim = cosine_similarity(query_vec, chunk_vec)
                    scored_chunks.append((sim, chunk))
                except Exception as e:
                    pass
                    
            scored_chunks.sort(key=lambda x: x[0], reverse=True)
            return [c for _, c in scored_chunks[:top_k]]
            
        except Exception as e:
            logger.error(f"Python vector search failed: {e}")
            return db.query(DocumentChunk).filter(DocumentChunk.document_id.in_(uuid_doc_ids)).limit(top_k).all()
    
    # Postgres pgvector implementation
    try:
        embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"
        query = sql_text("""
            SELECT dc.id, dc.document_id, dc.page_number, dc.chunk_index, dc.text,
                   dc.embedding <=> :embedding::vector AS distance
            FROM document_chunks dc
            WHERE dc.document_id = ANY(:doc_ids)
              AND dc.embedding IS NOT NULL
            ORDER BY dc.embedding <=> :embedding::vector
            LIMIT :limit
        """)
        
        result = db.execute(query, {
            "embedding": embedding_str,
            "doc_ids": document_ids,
            "limit": top_k
        })
        
        rows = result.fetchall()
        chunk_ids = [row[0] for row in rows]
        
        if not chunk_ids:
            return []
        
        chunks = db.query(DocumentChunk).filter(
            DocumentChunk.id.in_(chunk_ids)
        ).all()
        
        chunk_map = {str(c.id): c for c in chunks}
        return [chunk_map[str(cid)] for cid in chunk_ids if str(cid) in chunk_map]
        
    except Exception as e:
        logger.error(f"Vector search failed: {e}")
        logger.info("Falling back to basic text search")
        return db.query(DocumentChunk).filter(
            DocumentChunk.document_id.in_(uuid_doc_ids)
        ).limit(top_k).all()


def build_context(chunks: list[DocumentChunk], documents: dict[str, Document]) -> str:
    """Build context string from retrieved chunks with source info."""
    context_parts = []
    for chunk in chunks:
        doc = documents.get(str(chunk.document_id))
        doc_name = doc.original_filename if doc else "Unknown"
        context_parts.append(
            f"[Source: {doc_name}, Page {chunk.page_number}]\n{chunk.text}"
        )
    return "\n\n---\n\n".join(context_parts)


def get_conversation_history(db: Session, conversation_id: str, limit: int = 10) -> str:
    """Get recent conversation history formatted for context."""
    import uuid
    messages = db.query(Message).filter(
        Message.conversation_id == uuid.UUID(conversation_id)
    ).order_by(Message.created_at.desc()).limit(limit).all()
    
    messages.reverse()  # Chronological order
    
    history_parts = []
    for msg in messages:
        role = "User" if msg.role == "user" else "Assistant"
        history_parts.append(f"{role}: {msg.content[:500]}")
    
    return "\n".join(history_parts)


async def answer_question(
    db: Session,
    question: str,
    document_ids: list[str],
    user_id: str,
    conversation_id: str | None = None
) -> dict:
    """Main RAG pipeline: question -> embedding -> search -> context -> LLM -> answer."""
    ai_service = get_ai_service()
    
    # Verify document ownership
    documents = {}
    for doc_id in document_ids:
        import uuid
        doc = db.query(Document).filter(
            Document.id == uuid.UUID(doc_id),
            Document.user_id == uuid.UUID(user_id),
            Document.status == "ready"
        ).first()
        if doc:
            documents[str(doc.id)] = doc
    
    if not documents:
        return {
            "answer": "No valid documents selected. Please select at least one processed document.",
            "sources": [],
            "conversation_id": conversation_id
        }
    
    valid_doc_ids = list(documents.keys())
    
    # Step 1: Generate query embedding
    logger.info(f"Generating query embedding for: {question[:100]}")
    query_embedding = await ai_service.generate_query_embedding(question)
    
    # Step 2: Search similar chunks
    logger.info(f"Searching similar chunks in {len(valid_doc_ids)} documents")
    chunks = await search_similar_chunks(
        db, query_embedding, valid_doc_ids, top_k=settings.TOP_K_CHUNKS
    )
    
    if not chunks:
        return {
            "answer": "I couldn't find relevant information in the uploaded documents to answer this question.",
            "sources": [],
            "conversation_id": conversation_id
        }
    
    # Step 3: Build context
    context = build_context(chunks, documents)
    system_prompt = RAG_SYSTEM_PROMPT.format(context=context)
    
    # Step 4: Include conversation history if continuing a conversation
    if conversation_id:
        history = get_conversation_history(db, conversation_id)
        if history:
            system_prompt += "\n\n" + CONVERSATION_SYSTEM_PROMPT.format(history=history)
    
    # Step 5: Generate answer
    logger.info("Generating LLM response")
    answer = await ai_service.generate_text(
        prompt=question,
        system_prompt=system_prompt
    )
    
    # Step 6: Extract sources
    sources = []
    seen = set()
    for chunk in chunks:
        doc = documents.get(str(chunk.document_id))
        if doc:
            key = (str(doc.id), chunk.page_number)
            if key not in seen:
                seen.add(key)
                sources.append({
                    "document_id": str(doc.id),
                    "document_name": doc.original_filename,
                    "page": chunk.page_number
                })
    
    # Step 7: Handle conversation
    import uuid
    if not conversation_id:
        # Create new conversation
        conv = Conversation(
            user_id=uuid.UUID(user_id),
            title=question[:100],
            document_ids=[str(d) for d in valid_doc_ids]
        )
        db.add(conv)
        db.flush()
        conversation_id = str(conv.id)
    
    # Save messages
    user_msg = Message(
        conversation_id=uuid.UUID(conversation_id),
        role="user",
        content=question
    )
    assistant_msg = Message(
        conversation_id=uuid.UUID(conversation_id),
        role="assistant",
        content=answer,
        sources=sources
    )
    db.add(user_msg)
    db.add(assistant_msg)
    db.commit()
    
    return {
        "answer": answer,
        "sources": sources,
        "conversation_id": conversation_id
    }
