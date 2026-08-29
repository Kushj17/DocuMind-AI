import logging
from abc import ABC, abstractmethod
import google.generativeai as genai
from app.core.config import settings

logger = logging.getLogger(__name__)

class AIService(ABC):
    """Abstract base class for AI providers."""
    @abstractmethod
    async def generate_text(self, prompt: str, system_prompt: str | None = None) -> str:
        pass
    
    @abstractmethod
    async def generate_embedding(self, text: str) -> list[float]:
        pass
    
    @abstractmethod
    async def generate_embeddings_batch(self, texts: list[str]) -> list[list[float]]:
        pass


class GeminiAIService(AIService):
    """Google Gemini AI provider implementation."""
    
    def __init__(self):
        if not settings.GOOGLE_API_KEY:
            logger.warning("GOOGLE_API_KEY not set. AI features will not work.")
            return
        genai.configure(api_key=settings.GOOGLE_API_KEY)
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
    
    async def generate_text(self, prompt: str, system_prompt: str | None = None) -> str:
        try:
            full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
            response = self.model.generate_content(full_prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini text generation failed: {e}")
            raise RuntimeError(f"AI text generation failed: {str(e)}")
    
    async def generate_embedding(self, text: str) -> list[float]:
        try:
            result = genai.embed_content(
                model=f"models/{settings.EMBEDDING_MODEL}",
                content=text,
                task_type="retrieval_document"
            )
            return result['embedding']
        except Exception as e:
            logger.error(f"Gemini embedding generation failed: {e}")
            raise RuntimeError(f"Embedding generation failed: {str(e)}")
    
    async def generate_embeddings_batch(self, texts: list[str]) -> list[list[float]]:
        try:
            embeddings = []
            # Process in batches of 100 (Gemini limit)
            batch_size = 100
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                for text in batch:
                    result = genai.embed_content(
                        model=f"models/{settings.EMBEDDING_MODEL}",
                        content=text,
                        task_type="retrieval_document"
                    )
                    embeddings.append(result['embedding'])
            return embeddings
        except Exception as e:
            logger.error(f"Batch embedding generation failed: {e}")
            raise RuntimeError(f"Batch embedding generation failed: {str(e)}")
    
    async def generate_query_embedding(self, text: str) -> list[float]:
        """Generate embedding specifically for query/retrieval."""
        try:
            result = genai.embed_content(
                model=f"models/{settings.EMBEDDING_MODEL}",
                content=text,
                task_type="retrieval_query"
            )
            return result['embedding']
        except Exception as e:
            logger.error(f"Query embedding generation failed: {e}")
            raise RuntimeError(f"Query embedding generation failed: {str(e)}")


def get_ai_service() -> GeminiAIService:
    """Factory function to get AI service instance."""
    return GeminiAIService()
