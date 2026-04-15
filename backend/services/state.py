from datetime import datetime, timezone

import aiosqlite

from backend.models import PhaseStatus


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class StateService:
    def __init__(self, db: aiosqlite.Connection):
        self._db = db

    async def init_phase(self, phase_id: str) -> None:
        await self._db.execute(
            "INSERT OR IGNORE INTO phase_state (phase_id, status) VALUES (?, ?)",
            (phase_id, PhaseStatus.PENDING),
        )
        await self._db.commit()

    async def get_phase(self, phase_id: str) -> dict | None:
        cursor = await self._db.execute(
            "SELECT * FROM phase_state WHERE phase_id = ?", (phase_id,)
        )
        row = await cursor.fetchone()
        if row is None:
            return None
        return dict(row)

    async def list_phases(self) -> list[dict]:
        cursor = await self._db.execute("SELECT * FROM phase_state ORDER BY phase_id")
        return [dict(row) for row in await cursor.fetchall()]

    async def update_phase_status(
        self, phase_id: str, status: PhaseStatus, result_summary: str | None = None
    ) -> None:
        now = _now()
        if status == PhaseStatus.RUNNING:
            await self._db.execute(
                "UPDATE phase_state SET status = ?, started_at = ? WHERE phase_id = ?",
                (status, now, phase_id),
            )
        elif status in (PhaseStatus.COMPLETED, PhaseStatus.FAILED):
            await self._db.execute(
                "UPDATE phase_state SET status = ?, completed_at = ?, result_summary = ? WHERE phase_id = ?",
                (status, now, result_summary, phase_id),
            )
        else:
            await self._db.execute(
                "UPDATE phase_state SET status = ? WHERE phase_id = ?",
                (status, phase_id),
            )
        await self._db.commit()

    async def start_agent_run(self, phase_id: str, agent_id: str) -> int:
        cursor = await self._db.execute(
            "INSERT INTO agent_runs (phase_id, agent_id, status, started_at) VALUES (?, ?, ?, ?)",
            (phase_id, agent_id, PhaseStatus.RUNNING, _now()),
        )
        await self._db.commit()
        return cursor.lastrowid

    async def get_agent_run(self, run_id: int) -> dict | None:
        cursor = await self._db.execute(
            "SELECT * FROM agent_runs WHERE id = ?", (run_id,)
        )
        row = await cursor.fetchone()
        if row is None:
            return None
        return dict(row)

    async def complete_agent_run(self, run_id: int, output: str) -> None:
        await self._db.execute(
            "UPDATE agent_runs SET status = ?, output = ?, completed_at = ? WHERE id = ?",
            (PhaseStatus.COMPLETED, output, _now(), run_id),
        )
        await self._db.commit()

    async def fail_agent_run(self, run_id: int, error: str) -> None:
        await self._db.execute(
            "UPDATE agent_runs SET status = ?, output = ?, completed_at = ? WHERE id = ?",
            (PhaseStatus.FAILED, error, _now(), run_id),
        )
        await self._db.commit()

    async def save_chapter(
        self,
        chapter_num: int,
        title: str,
        phase_id: str,
        content_path: str,
        word_count: int,
    ) -> None:
        await self._db.execute(
            """INSERT OR REPLACE INTO chapters
               (chapter_num, title, phase_id, content_path, word_count, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (chapter_num, title, phase_id, content_path, word_count, _now()),
        )
        await self._db.commit()

    async def get_chapter(self, chapter_num: int) -> dict | None:
        cursor = await self._db.execute(
            "SELECT * FROM chapters WHERE chapter_num = ?", (chapter_num,)
        )
        row = await cursor.fetchone()
        if row is None:
            return None
        return dict(row)

    async def list_chapters(self) -> list[dict]:
        cursor = await self._db.execute(
            "SELECT * FROM chapters ORDER BY chapter_num"
        )
        return [dict(row) for row in await cursor.fetchall()]
