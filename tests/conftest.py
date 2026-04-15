import os
import tempfile
from pathlib import Path

import pytest

from backend.config import Settings


@pytest.fixture
def tmp_project(tmp_path):
    """임시 프로젝트 디렉토리 — bible/, chapters/, DB 포함."""
    bible_dir = tmp_path / "bible"
    bible_dir.mkdir()
    chapters_dir = tmp_path / "chapters"
    chapters_dir.mkdir()
    db_path = tmp_path / "test.db"
    return {
        "root": tmp_path,
        "bible_dir": str(bible_dir),
        "chapters_dir": str(chapters_dir),
        "db_path": str(db_path),
    }


@pytest.fixture
def settings(tmp_project):
    return Settings(
        ANTHROPIC_API_KEY="test-key",
        BIBLE_DIR=tmp_project["bible_dir"],
        CHAPTERS_DIR=tmp_project["chapters_dir"],
        DATABASE_PATH=tmp_project["db_path"],
        PHASES_CONFIG="config/phases.json",
    )
