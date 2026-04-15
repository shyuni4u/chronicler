import os
from backend.config import Settings


def test_settings_defaults():
    settings = Settings(ANTHROPIC_API_KEY="test-key")
    assert settings.ANTHROPIC_API_KEY == "test-key"
    assert settings.BIBLE_DIR == "bible"
    assert settings.CHAPTERS_DIR == "chapters"
    assert settings.DATABASE_PATH == "chronicler.db"
    assert settings.PHASES_CONFIG == "config/phases.json"


def test_settings_from_env(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "env-key")
    monkeypatch.setenv("BIBLE_DIR", "custom_bible")
    settings = Settings()
    assert settings.ANTHROPIC_API_KEY == "env-key"
    assert settings.BIBLE_DIR == "custom_bible"
