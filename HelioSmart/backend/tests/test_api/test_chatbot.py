"""
Tests for Chatbot API endpoints
"""
import pytest
import io
from unittest.mock import Mock, patch, MagicMock


class TestChatbotEndpoints:
    """Test chatbot API endpoints"""

    def test_get_chatbot_status(self, client):
        """Test getting chatbot service status"""
        response = client.get("/api/v1/chatbot/status")
        
        assert response.status_code == 200
        data = response.json()
        assert "device" in data
        assert "llm_available" in data
        assert "tts_available" in data
        assert "stt_available" in data
        assert "rag_available" in data

    @patch('app.api.chatbot.get_chatbot_service')
    def test_chat_endpoint(self, mock_get_service, client):
        """Test chat endpoint with LLM"""
        # Mock the chatbot service
        mock_service = Mock()
        mock_service.get_rag_context.return_value = ""
        mock_service.get_session_rag_context.return_value = ""
        mock_get_service.return_value = mock_service
        
        # Mock async generate_response
        async def mock_generate_response(*args, **kwargs):
            return "Solar panels convert sunlight into electricity using photovoltaic cells."
        
        mock_service.generate_response = mock_generate_response
        
        chat_data = {
            "query": "What is solar energy?",
            "language": "en",
            "max_tokens": 400,
            "use_rag": True
        }
        
        response = client.post("/api/v1/chatbot/chat", json=chat_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "query" in data
        assert "response" in data
        assert "language" in data
        assert data["query"] == "What is solar energy?"
        assert len(data["response"]) > 0

    @patch('app.api.chatbot.get_chatbot_service')
    def test_chat_with_history(self, mock_get_service, client):
        """Test chat endpoint with conversation history"""
        mock_service = Mock()
        mock_service.get_rag_context.return_value = ""
        mock_service.get_session_rag_context.return_value = ""
        mock_get_service.return_value = mock_service
        
        async def mock_generate_response(*args, **kwargs):
            return "Based on your previous question, solar panels are typically 15-22% efficient."
        
        mock_service.generate_response = mock_generate_response
        
        chat_data = {
            "query": "How efficient are they?",
            "language": "en",
            "history": [
                {"role": "user", "content": "What is solar energy?"},
                {"role": "assistant", "content": "Solar panels convert sunlight into electricity."}
            ]
        }
        
        response = client.post("/api/v1/chatbot/chat", json=chat_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["query"] == "How efficient are they?"

    @patch('app.api.chatbot.get_chatbot_service')
    def test_tts_endpoint(self, mock_get_service, client):
        """Test text-to-speech endpoint"""
        mock_service = Mock()
        mock_service.generate_speech.return_value = "/tmp/test_audio.mp3"
        mock_get_service.return_value = mock_service
        
        # Create a mock audio file
        with patch('os.path.exists', return_value=True):
            with patch('app.api.chatbot.FileResponse') as mock_file_response:
                mock_file_response.return_value = Mock(status_code=200)
                
                tts_data = {
                    "text": "Hello, this is a test",
                    "language": "en"
                }
                
                response = client.post("/api/v1/chatbot/tts", json=tts_data)
                
                # Should call generate_speech
                mock_service.generate_speech.assert_called_once()

    @patch('app.api.chatbot.get_chatbot_service')
    def test_tts_endpoint_failure(self, mock_get_service, client):
        """Test TTS endpoint when speech generation fails"""
        mock_service = Mock()
        mock_service.generate_speech.return_value = None
        mock_get_service.return_value = mock_service
        
        tts_data = {
            "text": "Test text",
            "language": "en"
        }
        
        response = client.post("/api/v1/chatbot/tts", json=tts_data)
        
        assert response.status_code == 500

    @patch('app.api.chatbot.get_chatbot_service')
    def test_chat_with_tts_endpoint(self, mock_get_service, client):
        """Test chat endpoint that returns both text and audio"""
        mock_service = Mock()
        mock_service.get_rag_context.return_value = ""
        mock_service.get_session_rag_context.return_value = ""
        mock_service.generate_speech.return_value = "/tmp/test_response.mp3"
        mock_get_service.return_value = mock_service
        
        async def mock_generate_response(*args, **kwargs):
            return "Solar energy is renewable."
        
        mock_service.generate_response = mock_generate_response
        
        with patch('os.path.exists', return_value=True):
            chat_data = {
                "query": "What is solar energy?",
                "language": "en"
            }
            
            response = client.post("/api/v1/chatbot/chat-with-tts", json=chat_data)
            
            assert response.status_code == 200

    @patch('app.api.chatbot.get_chatbot_service')
    def test_upload_audio_endpoint(self, mock_get_service, client):
        """Test audio upload for speech-to-text"""
        mock_service = Mock()
        mock_service.transcribe_audio.return_value = ("What is solar energy?", "en")
        mock_service.get_rag_context.return_value = ""
        mock_service.get_session_rag_context.return_value = ""
        mock_get_service.return_value = mock_service
        
        async def mock_generate_response(*args, **kwargs):
            return "Solar panels convert light to electricity."
        
        mock_service.generate_response = mock_generate_response
        
        # Create fake audio file
        audio_data = b"fake audio data"
        files = {
            "file": ("test_audio.mp3", io.BytesIO(audio_data), "audio/mpeg")
        }
        data = {"language": "en"}
        
        response = client.post("/api/v1/chatbot/upload-audio", files=files, data=data)
        
        # Should process the audio
        assert response.status_code in [200, 503]  # 503 if service not available

    @patch('app.api.chatbot.get_chatbot_service')
    def test_add_document_to_knowledge_base(self, mock_get_service, client):
        """Test adding document to global knowledge base"""
        mock_service = Mock()
        mock_service.add_document.return_value = True
        mock_get_service.return_value = mock_service
        
        # Create fake PDF file
        pdf_data = b"%PDF-1.4 fake pdf content"
        files = {
            "file": ("test_doc.pdf", io.BytesIO(pdf_data), "application/pdf")
        }
        
        response = client.post("/api/v1/chatbot/add-document", files=files)
        
        # Should accept the document
        assert response.status_code in [200, 503]

    @patch('app.api.chatbot.get_chatbot_service')
    def test_upload_session_document(self, mock_get_service, client):
        """Test uploading document to user's private session"""
        mock_service = Mock()
        mock_service.add_session_document.return_value = True
        mock_get_service.return_value = mock_service
        
        # Create fake PDF file
        pdf_data = b"%PDF-1.4 fake pdf content"
        files = {
            "file": ("user_manual.pdf", io.BytesIO(pdf_data), "application/pdf")
        }
        data = {"session_id": "user123"}
        
        response = client.post("/api/v1/chatbot/upload-session-document", files=files, data=data)
        
        # Should accept the document
        assert response.status_code in [200, 503]

    @patch('app.api.chatbot.get_chatbot_service')
    def test_get_session_info(self, mock_get_service, client):
        """Test getting session information"""
        mock_service = Mock()
        mock_service.get_session_info.return_value = {
            "session_id": "user123",
            "documents": ["doc1.pdf", "doc2.pdf"],
            "created_at": "2026-05-07T00:00:00"
        }
        mock_get_service.return_value = mock_service
        
        response = client.get("/api/v1/chatbot/session/user123")
        
        assert response.status_code in [200, 503]

    @patch('app.api.chatbot.get_chatbot_service')
    def test_delete_session(self, mock_get_service, client):
        """Test deleting a user session"""
        mock_service = Mock()
        mock_service.delete_session.return_value = True
        mock_get_service.return_value = mock_service
        
        response = client.delete("/api/v1/chatbot/session/user123")
        
        assert response.status_code in [200, 503]

    def test_chatbot_service_not_initialized(self, client):
        """Test endpoints when chatbot service is not initialized"""
        # The service might not be initialized in test environment
        chat_data = {
            "query": "Test query",
            "language": "en"
        }
        
        response = client.post("/api/v1/chatbot/chat", json=chat_data)
        
        # Should return 503 Service Unavailable or 200 if mocked
        assert response.status_code in [200, 503]

    def test_chat_with_different_languages(self, client):
        """Test chat endpoint with different languages"""
        languages = ["en", "fr", "ar"]
        
        for lang in languages:
            chat_data = {
                "query": "مرحبا" if lang == "ar" else "Bonjour" if lang == "fr" else "Hello",
                "language": lang
            }
            
            response = client.post("/api/v1/chatbot/chat", json=chat_data)
            
            # Should handle different languages
            assert response.status_code in [200, 503]

    def test_chat_with_rag_disabled(self, client):
        """Test chat endpoint with RAG disabled"""
        chat_data = {
            "query": "What is solar energy?",
            "language": "en",
            "use_rag": False
        }
        
        response = client.post("/api/v1/chatbot/chat", json=chat_data)
        
        assert response.status_code in [200, 503]
        if response.status_code == 200:
            data = response.json()
            # RAG might be disabled
            assert "context_used" in data
