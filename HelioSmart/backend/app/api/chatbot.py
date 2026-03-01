"""
Chatbot endpoints with Ollama LLM integration for HelioSmart
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import os
import logging
import tempfile
from fastapi.responses import FileResponse

logger = logging.getLogger(__name__)

# Lazy import for ChatbotService to avoid import errors when ML dependencies are not available
ChatbotService = None

def _get_chatbot_service_class():
    global ChatbotService
    if ChatbotService is None:
        try:
            from app.services.chatbot_service import ChatbotService as _ChatbotService
            ChatbotService = _ChatbotService
        except Exception as e:
            logger.warning(f"ChatbotService not available: {e}")
            ChatbotService = None
    return ChatbotService

router = APIRouter()

# Global chatbot service instance
_chatbot_service = None


def get_chatbot_service():
    """Get or initialize chatbot service"""
    global _chatbot_service
    ChatbotServiceClass = _get_chatbot_service_class()
    if ChatbotServiceClass is None:
        raise HTTPException(status_code=503, detail="Chatbot service not available - ML dependencies not installed")
    if _chatbot_service is None:
        _chatbot_service = ChatbotServiceClass()
    return _chatbot_service


# Schemas
class ChatRequest(BaseModel):
    query: str
    language: str = "en"
    max_tokens: int = 400
    use_rag: bool = True


class ChatResponse(BaseModel):
    query: str
    response: str
    language: str
    context_used: bool


class AudioResponse(BaseModel):
    transcription: str
    response: str
    language: str
    audio_url: Optional[str] = None


class TTSRequest(BaseModel):
    text: str
    language: str = "en"


@router.get("/status")
async def get_chatbot_status():
    """Get chatbot service status"""
    service = get_chatbot_service()
    return service.get_status()


@router.post("/tts")
async def text_to_speech(request: TTSRequest):
    """Convert text to speech and return audio file"""
    try:
        service = get_chatbot_service()
        
        # Generate speech
        speech_file = service.generate_speech(request.text, request.language)
        
        if not speech_file or not os.path.exists(speech_file):
            raise HTTPException(status_code=500, detail="Failed to generate speech")
        
        return FileResponse(
            speech_file,
            media_type="audio/mpeg",
            filename=os.path.basename(speech_file)
        )
    except Exception as e:
        logger.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat with the AI assistant"""
    try:
        service = get_chatbot_service()
        
        # Get RAG context if enabled
        context = ""
        context_used = False
        if request.use_rag:
            context = service.get_rag_context(request.query)
            context_used = bool(context)
        
        # Generate response
        response = await service.generate_response(
            query=request.query,
            context=context,
            language=request.language,
            max_tokens=request.max_tokens,
        )
        
        return ChatResponse(
            query=request.query,
            response=response,
            language=request.language,
            context_used=context_used,
        )
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat-with-tts")
async def chat_with_tts(request: ChatRequest):
    """Chat and generate speech response"""
    try:
        service = get_chatbot_service()
        
        # Get RAG context if enabled
        context = ""
        if request.use_rag:
            context = service.get_rag_context(request.query)
        
        # Generate response
        response = await service.generate_response(
            query=request.query,
            context=context,
            language=request.language,
            max_tokens=request.max_tokens,
        )
        
        # Generate speech
        speech_file = service.generate_speech(response, request.language)
        speech_url = f"/api/v1/chatbot/audio/{os.path.basename(speech_file)}" if speech_file else None
        
        return {
            "query": request.query,
            "response": response,
            "speech_url": speech_url,
            "language": request.language,
        }
    except Exception as e:
        logger.error(f"Chat with TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload-audio", response_model=AudioResponse)
async def upload_audio(audio: UploadFile = File(...)):
    """Upload audio, transcribe, and generate response"""
    try:
        service = get_chatbot_service()
        
        # Save uploaded file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            content = await audio.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            # Transcribe
            transcription, language = service.transcribe_audio(tmp_path)
            
            # Get RAG context
            context = service.get_rag_context(transcription)
            
            # Generate response
            response = await service.generate_response(
                query=transcription,
                context=context,
                language=language,
            )
            
            # Generate speech
            speech_file = service.generate_speech(response, language)
            speech_url = f"/api/v1/chatbot/audio/{os.path.basename(speech_file)}" if speech_file else None
            
            return AudioResponse(
                transcription=transcription,
                response=response,
                language=language,
                audio_url=speech_url,
            )
        finally:
            # Cleanup
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    except Exception as e:
        logger.error(f"Audio upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/add-document")
async def add_document(file: UploadFile = File(...)):
    """Add document to RAG knowledge base"""
    try:
        service = get_chatbot_service()
        
        # Save file
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            # Process document
            result = service.add_document_to_rag(tmp_path)
            return result
        finally:
            # Cleanup
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    except Exception as e:
        logger.error(f"Document upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audio/{filename}")
async def serve_audio(filename: str):
    """Serve generated audio files"""
    try:
        audio_path = os.path.join("audio", filename)
        if os.path.exists(audio_path):
            return FileResponse(audio_path, media_type="audio/mpeg")
        else:
            raise HTTPException(status_code=404, detail="Audio file not found")
    except Exception as e:
        logger.error(f"Audio serve error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
