from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator
import json


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    ENVIRONMENT: str = "development"


    # JWT
    SECRET_KEY: str = "development_secret_key_change_me_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Ollama AI
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_VISION_MODEL: str = "moondream"
    OLLAMA_LLM_MODEL: str = "phi3:mini"
    OLLAMA_CHAT_MODEL: str = "phi3:mini"
    OLLAMA_MINI_MODEL: str = "phi3:mini"  # Upgraded from qwen2.5 for better RAG quality

    # External API Keys
    USDA_API_KEY: str = ""  # Get free key at https://api.nal.usda.gov/fdc/v1/

    # RAG — ChromaDB vector store
    CHROMA_DB_PATH: str = "./chroma_db"
    RAG_COLLECTION_NUTRITION: str = "nutrition_facts"
    RAG_COLLECTION_GUIDELINES: str = "diabetes_guidelines"
    ENABLE_AUTO_DATASET_FETCH: bool = True

    # Prediction models storage
    MODELS_DIR: str = "./models"

    # Supabase (service-role key — backend only, never expose to client)
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    # Media / File Storage
    MEDIA_DIR: str = "./media/uploads"
    MAX_IMAGE_SIZE_MB: int = 10

    # CORS
    ALLOWED_ORIGINS: str = '["http://localhost:8081","http://localhost:8082","http://localhost:8083","http://localhost:3000","exp://192.168.1.100:8081","https://Niranjan6699.github.io"]'

    @property
    def allowed_origins_list(self) -> List[str]:
        try:
            return json.loads(self.ALLOWED_ORIGINS)
        except Exception as e:
            raise ValueError(f"Failed to parse ALLOWED_ORIGINS: {e}")

    @property
    def media_dir_path(self) -> Path:
        p = Path(self.MEDIA_DIR)
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def max_image_bytes(self) -> int:
        return self.MAX_IMAGE_SIZE_MB * 1024 * 1024

    @model_validator(mode='after')
    def validate_production_secret(self):
        if self.ENVIRONMENT == "production" and self.SECRET_KEY == "development_secret_key_change_me_in_production":
            raise RuntimeError("You must change the SECRET_KEY in production environment!")
        return self


settings = Settings()
