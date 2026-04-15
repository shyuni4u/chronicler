from enum import StrEnum
from pydantic import BaseModel


class PhaseStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class AgentConfig(BaseModel):
    id: str
    depends_on: list[str] = []


class PhaseConfig(BaseModel):
    id: str
    name: str
    depends_on_phase: str | None = None
    agents: list[AgentConfig]


class PhasesConfig(BaseModel):
    phases: list[PhaseConfig]


class AgentContext(BaseModel):
    bible: dict
    phase_state: dict
    dependencies: dict
    chapter_num: int | None = None


class AgentResult(BaseModel):
    agent_id: str
    output: str
    metadata: dict = {}
