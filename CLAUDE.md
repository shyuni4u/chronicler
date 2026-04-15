# Chronicler

> Multi-agent novel writing system powered by Claude. One chapter at a time.

---

## Project Structure

CLAUDE.md # 전체 제약 & critical 규칙 (현재 파일)
bible/ # 소설 바이블 — 에이전트 룰북 (.gitignore)
example/ # 템플릿 (git 포함)
world.md
characters.md
timeline.md
rules.md
docs/
PRD.md # 무엇을 만드는지
ARCHITECTURE.md # 어떻게 만드는지
ADR.md # 왜 이렇게 만드는지
UI_GUIDE.md # 어떻게 보여야 하는지
phases/ # Phase 명세 + 실행 상태
01_world_building.md
02_characters.md
state/ # (.gitignore)
.claude/
commands/
harness.md # 전체 Phase 원스톱 실행
review.md # 코드 리뷰
validate.md # bible 일관성 검증
settings.json
scripts/
execute.js
hooks/

---

## Read Order

태스크 시작 전 반드시 이 순서로 참조:

1. CLAUDE.md (현재)
2. docs/ARCHITECTURE.md
3. 해당 Phase 파일 (phases/)
4. bible/ 관련 파일

---

## Critical Rules

- bible/ 내용과 충돌하는 출력 금지
- Phase는 순서대로만 실행 — 스킵 불가
- state/ 업데이트 없이 다음 Phase 진행 금지
- bible/ 파일 직접 수정 금지 — validate 커맨드 거쳐야 함

---

## Forbidden

- 하드코딩된 설정값 (API key, path 등)
- Phase 건너뛰기
- bible/ 검증 없는 캐릭터/세계관 변경
- state/ 무시하고 이전 Phase 재실행

---

## Stack

- backend: FastAPI + Anthropic SDK
- frontend: Next.js — localhost 웹 UI
- streaming: SSE
- state: JSON / SQLite (bible + phase state)

---

## License

MIT — system only, novel content is private
