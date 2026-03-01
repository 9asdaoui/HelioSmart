"""
Chatbot endpoints with Ollama LLM integration for HelioSmart
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
import os
import logging
import tempfile
import asyncio
import threading
from fastapi.responses import FileResponse

logger = logging.getLogger(__name__)

router = APIRouter()

# Global chatbot service instance + initialization state
_chatbot_service = None
_init_lock = threading.Lock()
_initializing = False
_init_error: Optional[str] = None


def _background_init():
    """Run chatbot service initialization in a background thread so startup is non-blocking."""
    global _chatbot_service, _initializing, _init_error
    try:
        logger.info("Chatbot: starting background initialization…")
        from app.services.chatbot_service import ChatbotService
        instance = ChatbotService()
        with _init_lock:
            _chatbot_service = instance
            _initializing = False
        logger.info("Chatbot: background initialization complete.")
    except Exception as e:
        logger.error(f"Chatbot: background initialization failed: {e}")
        with _init_lock:
            _init_error = str(e)
            _initializing = False


def start_background_init():
    """Called once at app startup — launches init in a daemon thread."""
    global _initializing
    with _init_lock:
        if _initializing or _chatbot_service is not None:
            return
        _initializing = True
    t = threading.Thread(target=_background_init, daemon=True, name="chatbot-init")
    t.start()


def get_chatbot_service():
    """Return the service instance or raise 503 if not ready yet."""
    with _init_lock:
        if _chatbot_service is not None:
            return _chatbot_service
        if _init_error:
            raise HTTPException(status_code=503, detail=f"Chatbot init failed: {_init_error}")
        if _initializing:
            raise HTTPException(
                status_code=503,
                detail="Chatbot is still initializing (downloading models). Please retry in a moment."
            )
    raise HTTPException(status_code=503, detail="Chatbot service not available")


# Schemas
class HistoryMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    query: str
    language: str = "en"
    max_tokens: int = 400
    use_rag: bool = True
    history: Optional[List[HistoryMessage]] = []


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
    """Get chatbot service status — always responds immediately, never blocks."""
    with _init_lock:
        svc = _chatbot_service
        initializing = _initializing
        err = _init_error

    if svc is not None:
        return svc.get_status()

    # Service not ready yet — return current state without blocking
    return {
        "device": "cpu",
        "llm_available": False,
        "llm_model": None,
        "ollama_url": os.getenv("OLLAMA_URL", "http://localhost:11434"),
        "rag_available": False,
        "stt_available": False,
        "tts_available": False,
        "initializing": initializing,
        "init_error": err,
    }


@router.post("/tts")
async def text_to_speech(request: TTSRequest):
    """Convert text to speech and return audio file"""
    try:
        service = get_chatbot_service()
        
        # Generate speech
        speech_file = service.generate_speech(request.text, request.language)
        
        if not speech_file or not os.path.exists(speech_file):
            raise HTTPException(status_code=500, detail="Failed to generate speech")
        
        # Use BackgroundTask to delete the temp file after the response is sent
        from starlette.background import BackgroundTask

        def cleanup():
            try:
                if os.path.exists(speech_file):
                    os.remove(speech_file)
            except Exception:
                pass

        return FileResponse(
            speech_file,
            media_type="audio/mpeg",
            filename=os.path.basename(speech_file),
            background=BackgroundTask(cleanup),
        )
    except HTTPException:
        raise
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
        
        # Build history list for LLM
        history = [(m.role, m.content) for m in (request.history or [])]

        # Generate response
        response = await service.generate_response(
            query=request.query,
            context=context,
            language=request.language,
            max_tokens=request.max_tokens,
            history=history,
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
        # Sanitize filename to prevent path traversal
        safe_name = os.path.basename(filename)
        if not safe_name or safe_name != filename:
            raise HTTPException(status_code=400, detail="Invalid filename")
        
        audio_path = os.path.join("audio", safe_name)
        if os.path.exists(audio_path):
            return FileResponse(audio_path, media_type="audio/mpeg")
        else:
            raise HTTPException(status_code=404, detail="Audio file not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Audio serve error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
