import aiosqlite
import pytest

from backend.database import init_db, get_db


@pytest.fixture
async def db(tmp_project):
    db_path = tmp_project["db_path"]
    await init_db(db_path)
    async with aiosqlite.connect(db_path) as conn:
        yield conn


async def test_init_db_creates_tables(db):
    cursor = await db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    )
    tables = [row[0] for row in await cursor.fetchall()]
    assert "agent_runs" in tables
    assert "chapters" in tables
    assert "phase_state" in tables


async def test_phase_state_table_columns(db):
    cursor = await db.execute("PRAGMA table_info(phase_state)")
    columns = {row[1] for row in await cursor.fetchall()}
    assert columns == {"phase_id", "status", "started_at", "completed_at", "result_summary"}


async def test_agent_runs_table_columns(db):
    cursor = await db.execute("PRAGMA table_info(agent_runs)")
    columns = {row[1] for row in await cursor.fetchall()}
    assert columns == {
        "id", "phase_id", "agent_id", "status",
        "input_context", "output", "started_at", "completed_at",
    }


async def test_chapters_table_columns(db):
    cursor = await db.execute("PRAGMA table_info(chapters)")
    columns = {row[1] for row in await cursor.fetchall()}
    assert columns == {
        "chapter_num", "title", "phase_id",
        "content_path", "word_count", "created_at",
    }


async def test_init_db_idempotent(tmp_project):
    db_path = tmp_project["db_path"]
    await init_db(db_path)
    await init_db(db_path)  # 두 번 호출해도 에러 없음
    async with aiosqlite.connect(db_path) as conn:
        cursor = await conn.execute(
            "SELECT count(*) FROM sqlite_master WHERE type='table'"
        )
        count = (await cursor.fetchone())[0]
        assert count == 3
