from backend.models import (
    AgentContext,
    AgentResult,
    PhaseConfig,
    AgentConfig,
    PhasesConfig,
    PhaseStatus,
)


def test_agent_context_defaults():
    ctx = AgentContext(bible={}, phase_state={}, dependencies={})
    assert ctx.chapter_num is None
    assert ctx.bible == {}


def test_agent_context_with_chapter():
    ctx = AgentContext(
        bible={"world": "fantasy"},
        phase_state={},
        dependencies={"writer": "output text"},
        chapter_num=3,
    )
    assert ctx.chapter_num == 3
    assert ctx.dependencies["writer"] == "output text"


def test_agent_result():
    result = AgentResult(agent_id="writer", output="Chapter text", metadata={"word_count": 500})
    assert result.agent_id == "writer"
    assert result.metadata["word_count"] == 500


def test_phase_config_parsing():
    data = {
        "id": "01_world_building",
        "name": "World Building",
        "agents": [{"id": "world_builder", "depends_on": []}],
    }
    phase = PhaseConfig(**data)
    assert phase.id == "01_world_building"
    assert phase.depends_on_phase is None
    assert len(phase.agents) == 1
    assert phase.agents[0].id == "world_builder"


def test_phase_config_with_dependency():
    data = {
        "id": "02_characters",
        "name": "Characters",
        "depends_on_phase": "01_world_building",
        "agents": [{"id": "character_designer", "depends_on": []}],
    }
    phase = PhaseConfig(**data)
    assert phase.depends_on_phase == "01_world_building"


def test_phases_config_from_json():
    data = {
        "phases": [
            {
                "id": "01_world_building",
                "name": "World Building",
                "agents": [{"id": "world_builder", "depends_on": []}],
            }
        ]
    }
    config = PhasesConfig(**data)
    assert len(config.phases) == 1


def test_phase_status_values():
    assert PhaseStatus.PENDING == "pending"
    assert PhaseStatus.RUNNING == "running"
    assert PhaseStatus.COMPLETED == "completed"
    assert PhaseStatus.FAILED == "failed"
