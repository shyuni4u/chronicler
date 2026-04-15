import aiosqlite

_SCHEMA = """
CREATE TABLE IF NOT EXISTS phase_state (
    phase_id TEXT PRIMARY KEY,
    status TEXT CHECK(status IN ('pending','running','completed','failed')),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    result_summary TEXT
);

CREATE TABLE IF NOT EXISTS agent_runs (
    id INTEGER PRIMARY KEY,
    phase_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending','running','completed','failed')),
    input_context TEXT,
    output TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (phase_id) REFERENCES phase_state(phase_id)
);

CREATE TABLE IF NOT EXISTS chapters (
    chapter_num INTEGER PRIMARY KEY,
    title TEXT,
    phase_id TEXT,
    content_path TEXT,
    word_count INTEGER,
    created_at TIMESTAMP,
    FOREIGN KEY (phase_id) REFERENCES phase_state(phase_id)
);
"""


async def init_db(db_path: str) -> None:
    async with aiosqlite.connect(db_path) as db:
        await db.executescript(_SCHEMA)
        await db.commit()


async def get_db(db_path: str) -> aiosqlite.Connection:
    db = await aiosqlite.connect(db_path)
    db.row_factory = aiosqlite.Row
    return db
