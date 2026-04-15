from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str
    BIBLE_DIR: str = "bible"
    CHAPTERS_DIR: str = "chapters"
    DATABASE_PATH: str = "chronicler.db"
    PHASES_CONFIG: str = "config/phases.json"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}
