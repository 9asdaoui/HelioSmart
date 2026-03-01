from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "HelioSmart"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    
    # External APIs
    PVWATTS_API_KEY: str = ""
    OPENSOLAR_API_KEY: str = ""
    OPENSOLAR_ORG_ID: str = ""
    
    # Google Maps API
    GOOGLE_MAPS_API_KEY: str = "AIzaSyBWF4GwzK9NQfaHWgXzpyYzzOZUSsxt824"
    
    # Python SAM Service (Roof Segmentation)
    PY_SERVICE_URL: str = "http://host.docker.internal:8889"
    
    # Chatbot Configuration (Ollama)
    OLLAMA_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2:1b"
    ENABLE_CHATBOT: bool = True
    ENABLE_RAG: bool = True
    ENABLE_SPEECH: bool = True
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Convert CORS_ORIGINS string to list"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
