# Agent Implementation Notes (AGENT_NOTES.md)

## Workspace Assessment
1. **Initial Inspection:**
   - Workspace directory `D:\MindCoZ` originally contained a Django project (`MindCoZ/` and `MindCoZ_BackEnd/`) with 12 existing tests.
   - `manage.py` and `db.sqlite3` handled Django models (`ChatMessage`, `SensorReading`).
   - Prior to this intervention, neither a Flask backend nor a React frontend existed.
   - The Django `/api/chat` route returned a static fallback response (`"Thanks for sharing. I can listen, but this is a basic fallback response, not an AI-generated answer."`) with `"llm_enabled": false`.

2. **LLM Provider Decision:**
   - Provider: **Google Gemini** (`gemini-2.5-flash`).
   - SDK: Official Google GenAI Python SDK (`google-genai` version 2.33.0).
   - Rationale: Google Gemini provides a highly documented, fast, beginner-friendly API with free tier availability via Google AI Studio. It excels at multi-turn conversational reasoning, instruction adherence for supportive persona framing, and safety controls.

3. **Backend Architecture Choice:**
   - Created a clean, decoupled `flask_backend/` package (`app.py`, `llm_service.py`, `config.py`).
   - Why decoupled? It delivers the exact requested multi-tier architecture (`React Frontend -> Flask API -> LLM Service -> LLM Provider -> Flask API -> React Chat Interface`) without destructively altering or risking existing Django database schemas or authentication tests.
   - The Django application continues to pass all 12 tests cleanly.

4. **Honesty & Anti-Simulation Enforcement:**
   - In accordance with the prompt's mandatory requirement ("Never pretend the LLM is working without credentials and a successful test. Do not simulate the LLM using hardcoded responses"), when `GEMINI_API_KEY` is not present, the Flask service does not return canned/mock text.
   - Instead, it returns `HTTP 503` with `{ "error": "LLM_NOT_CONFIGURED", "status": "Not Connected", "llm_enabled": false }`.
   - The React frontend receives this and clearly labels the chat status as **Not Connected (API Key Required)**, showing an instruction banner for adding the key.

5. **Verification Records:**
   - **Flask Unit Tests:** 11/11 tests passed in `flask_backend/tests/test_flask_llm.py`.
   - **Django Tests:** 12/12 tests passed in `manage.py test`.
   - **Live HTTP Check:** Tested `GET /api/health`, `GET /api/status`, `POST /api/chat`, and `POST /api/chat/reset` against a running Flask instance on port 5000.
   - **Frontend Build:** `npm run build` compiled cleanly into `frontend/dist/` in 366ms.
