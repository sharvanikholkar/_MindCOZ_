# MentaBot Implementation Checklist (TODO.md)

- [x] **Phase 1: Workspace & Architecture Inspection**
  - [x] Inspect existing workspace (`MindCoZ/`, `MindCoZ_BackEnd/`, `manage.py`, `API_CONTRACT.md`, `PROGRESS.md`).
  - [x] Verify existing Django test suite (12 passing tests).
  - [x] Confirm no Flask backend or React frontend existed previously.
  - [x] Establish required multi-tier architecture: `React Frontend -> Flask API -> LLM Service -> LLM Provider -> Flask API -> React Chat Interface`.

- [x] **Phase 2: LLM Provider Selection & Backend Implementation**
  - [x] Selected **Google Gemini (`gemini-2.5-flash`)** via official `google-genai` SDK for beginner-friendly, high-performance, well-documented conversational AI.
  - [x] Created `flask_backend/config.py` loading environment variables (`GEMINI_API_KEY`, `GEMINI_MODEL`, `MAX_HISTORY_TURNS`, `PORT`, `HOST`) and defining the empathetic student-support system prompt.
  - [x] Created `flask_backend/llm_service.py` with multi-turn conversation formatting, token/turn limits, and robust exception handling (`APIError`, `ClientError`, `ServerError`).
  - [x] Implemented Flask routes in `flask_backend/app.py`: `GET /api/health`, `GET /api/status`, `POST /api/chat`, `POST /api/chat/reset`.
  - [x] Enforced strict non-simulation: returns HTTP 503 `LLM_NOT_CONFIGURED` when `GEMINI_API_KEY` is not provided; never serves canned responses as real AI.
  - [x] Added `flask_backend/requirements.txt` and `flask_backend/.env.example`.
  - [x] Created root `.gitignore` and `.env.example`.

- [x] **Phase 3: Backend Verification & Unit Tests**
  - [x] Authored comprehensive unit test suite in `flask_backend/tests/test_flask_llm.py` (11 tests covering health, status, input validation, missing credentials, mocked generation, rate limits, invalid keys, and reset).
  - [x] Verified all 11 Flask backend tests pass.
  - [x] Started live Flask server and verified HTTP responses (`/api/health`, `/api/status`, `/api/chat`, `/api/chat/reset`).
  - [x] Re-ran Django test suite (12 tests) to guarantee zero regression on existing backend components.

- [x] **Phase 4: React Frontend Implementation**
  - [x] Scaffolding React + Vite frontend in `frontend/`.
  - [x] Installed `lucide-react` for accessible, modern UI icons.
  - [x] Created dedicated API service module `frontend/src/services/api.js` (isolated calls, configurable `VITE_API_BASE_URL`).
  - [x] Created UI components:
    - [x] `Header.jsx`: Live connection badge (`Connected`, `Not Connected`, `Offline`) and "New Chat" reset button.
    - [x] `ChatMessageList.jsx`: Distinct user/assistant styling, formatted text, disclaimer tags, empty state.
    - [x] `ChatInput.jsx`: Expanding textarea, character counter, send button.
    - [x] `SuggestedTopics.jsx`: Quick student support prompt pills.
    - [x] `CrisisFooter.jsx`: Safety notice and crisis lifeline (988) contact information.
    - [x] Animated loading indicator with pulsing typing dots.
  - [x] Handled all states: loading, error banner, unconfigured state labeled as **Not Connected (API Key Required)**.
  - [x] Verified production build (`npm run build`) compiles successfully (0 errors).

- [x] **Phase 5: Project Documentation & Handover**
  - [x] Create `PRD.md` specifying complete functional, architectural, and safety requirements.
  - [x] Update `PROGRESS.md` reflecting completed milestones and current verified state.
  - [x] Update `README.md` with complete setup, running, and API testing documentation.
  - [x] Create `AGENT_NOTES.md` documenting technical decisions and verification records.
  - [x] Create `SECURITY.md` covering key storage, privacy, sanitization, and clinical disclaimers.
