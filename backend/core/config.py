"""Application configuration settings."""
import os
from pathlib import Path

class Settings:
    """Global application settings."""
    
    # App
    APP_NAME: str = "Hermes-DevOS"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = os.getenv("HERMES_DEBUG", "false").lower() == "true"
    
    # Server
    HOST: str = os.getenv("HERMES_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("HERMES_PORT", "8080"))
    
    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    LOG_DIR: Path = BASE_DIR / "logs"
    DB_PATH: Path = DATA_DIR / "devos.db"
    
    # Providers
    XIAOMI_API_KEY: str = os.getenv("XIAOMI_API_KEY", "")
    XIAOMI_BASE_URL: str = os.getenv("XIAOMI_BASE_URL", "https://api.xiaomi.com/v1")
    XIAOMI_MODEL: str = os.getenv("XIAOMI_MODEL", "mimo-v2.5-pro")
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_BASE_URL: str = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
    DEEPSEEK_MODEL: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o")
    
    # Memory
    MEMORY_DB_PATH: str = str(DATA_DIR / "memory.db")
    MEMORY_EMBEDDING_MODEL: str = "tfidf"
    
    # Repo
    REPO_SCAN_MAX_FILES: int = 500
    REPO_SCAN_MAX_SIZE: int = 1024 * 1024
    
    # Context
    MAX_CONTEXT_TOKENS: int = 8000
    CONTEXT_CHUNK_SIZE: int = 500
    CONTEXT_OVERLAP: int = 50
    
    # Agent
    MAX_AGENTS: int = 5
    SESSION_TIMEOUT: int = 3600
    
    def __init__(self):
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.LOG_DIR.mkdir(parents=True, exist_ok=True)

settings = Settings()
