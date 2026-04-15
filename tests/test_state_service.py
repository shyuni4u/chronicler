import pytest

from backend.database import init_db, get_db
from backend.models import PhaseStatus
from backend.services.state import StateService


@pytest.fixture
async def state_service(tmp_project):
    db_path = tmp_project["db_path"]
    await init_db(db_path)
    db = await get_db(db_path)
    yield StateService(db)
    await db.close()


async def test_init_phase(state_service):
    await state_service.init_phase("01_world_building")
    phase = await state_service.get_phase("01_world_building")
    assert phase["phase_id"] == "01_world_building"
    assert phase["status"] == "pending"


async def test_update_phase_status(state_service):
    await state_service.init_phase("01_world_building")
    await state_service.update_phase_status("01_world_building", PhaseStatus.RUNNING)
    phase = await state_service.get_phase("01_world_building")
    assert phase["status"] == "running"
    assert phase["started_at"] is not None


async def test_complete_phase(state_service):
    await state_service.init_phase("01_world_building")
    await state_service.update_phase_status("01_world_building", PhaseStatus.RUNNING)
    await state_service.update_phase_status(
        "01_world_building", PhaseStatus.COMPLETED, result_summary="Done"
    )
    phase = await state_service.get_phase("01_world_building")
    assert phase["status"] == "completed"
    assert phase["completed_at"] is not None
    assert phase["result_summary"] == "Done"


async def test_list_phases(state_service):
    await state_service.init_phase("01_world_building")
    await state_service.init_phase("02_characters")
    phases = await state_service.list_phases()
    assert len(phases) == 2


async def test_record_agent_run(state_service):
    await state_service.init_phase("01_world_building")
    run_id = await state_service.start_agent_run("01_world_building", "world_builder")
    assert run_id > 0
    run = await state_service.get_agent_run(run_id)
    assert run["status"] == "running"


async def test_complete_agent_run(state_service):
    await state_service.init_phase("01_world_building")
    run_id = await state_service.start_agent_run("01_world_building", "world_builder")
    await state_service.complete_agent_run(run_id, "output text")
    run = await state_service.get_agent_run(run_id)
    assert run["status"] == "completed"
    assert run["output"] == "output text"


async def test_fail_agent_run(state_service):
    await state_service.init_phase("01_world_building")
    run_id = await state_service.start_agent_run("01_world_building", "world_builder")
    await state_service.fail_agent_run(run_id, "API error")
    run = await state_service.get_agent_run(run_id)
    assert run["status"] == "failed"
    assert run["output"] == "API error"


async def test_save_chapter(state_service):
    await state_service.init_phase("04_chapter_1")
    await state_service.save_chapter(
        chapter_num=1,
        title="The Beginning",
        phase_id="04_chapter_1",
        content_path="chapters/01.md",
        word_count=1200,
    )
    chapter = await state_service.get_chapter(1)
    assert chapter["title"] == "The Beginning"
    assert chapter["word_count"] == 1200


async def test_list_chapters(state_service):
    await state_service.init_phase("04_chapter_1")
    await state_service.save_chapter(1, "Ch1", "04_chapter_1", "chapters/01.md", 1000)
    await state_service.save_chapter(2, "Ch2", "04_chapter_1", "chapters/02.md", 1100)
    chapters = await state_service.list_chapters()
    assert len(chapters) == 2
