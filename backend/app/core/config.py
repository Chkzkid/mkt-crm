import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "ProCRM - Intelligent Sales Engine"
    DATABASE_URL: str = "sqlite+aiosqlite:///./procrm.db"
    SECRET_KEY: str = "procrm-super-secret-key-change-in-prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    BACKUP_DIR: str = os.path.abspath("./backups")
    DEFAULT_LANGUAGE: str = "es"
    SMTP_SERVER: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
