# PRD — Chronicler

## 개요

Chronicler는 멀티에이전트 기반 장편소설 작성 시스템이다.
Claude API를 활용한 에이전트들이 역할을 분담하여, 일관성 있는 장편소설을 챕터 단위로 점진적으로 생성한다.

## 사용자

- 1인 개인 프로젝트
- 소설 작성 경험이 있는 개발자가 직접 사용

## 목표

1. **에이전트별 역할 분리** — 세계관 설계, 캐릭터 생성, 플롯 구성, 집필 등 각 단계를 전담 에이전트가 수행
2. **Bible 기반 일관성 유지** — 세계관·캐릭터·규칙을 bible 파일로 관리하여 모든 에이전트가 동일한 맥락을 공유
3. **챕터별 점진적 생성** — Phase 순서에 따라 한 챕터씩 생성, 이전 챕터와의 연속성 보장

## 핵심 기능

### Bible 시스템
- 세계관(world), 캐릭터(characters), 규칙(rules) 등을 구조화된 마크다운으로 관리
- 모든 에이전트는 bible을 참조하여 출력 생성
- bible 수정 시 검증(validate) 프로세스 필수

### Phase 기반 워크플로우
- 각 Phase는 순서대로만 실행 가능 (스킵 불가)
- Phase별 상태(state)를 저장하여 진행 상황 추적
- 이전 Phase 완료 없이 다음 Phase 진행 불가

### 에이전트 역할
| 에이전트 | 역할 |
|---------|------|
| World Builder | 세계관 설정 및 배경 구축 |
| Character Designer | 캐릭터 생성 및 관계 설정 |
| Plot Architect | 전체 플롯 및 챕터 구조 설계 |
| Writer | 실제 챕터 집필 |
| Editor | 일관성 검토 및 교정 |

### 웹 UI
- localhost에서 실행되는 Next.js 기반 웹 인터페이스
- SSE를 통한 실시간 스트리밍 출력
- Phase 진행 상황 시각화

## 기술 스택

- **Backend**: FastAPI + Anthropic SDK
- **Frontend**: Next.js
- **Streaming**: SSE (Server-Sent Events)
- **State**: JSON / SQLite

## 비기능 요구사항

- 소설 콘텐츠(bible/, chapters/)는 git에 포함하지 않음
- 시스템 코드만 MIT 라이선스 적용
- 오프라인 환경에서도 이전 생성 결과 열람 가능
