import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "")
    # POSTGRES_PORT: int = os.getenv("POSTGRES_PORT", 5432)
    # POSTGRES_USER: str = os.getenv("POSTGRES_USER", "")
    # POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "")
    # POSTGRES_DB: str = os.getenv("POSTGRES_DB", "")

    BACKEND_PORT: int = os.getenv("BACKEND_PORT", 9009)


settings = Settings()
