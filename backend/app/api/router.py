from fastapi import APIRouter
from app.api import auth, documents, chat, quiz, dashboard

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(quiz.router, prefix="", tags=["quiz"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
