# MentaBot Product Requirements Document (PRD)

## 1. Executive Summary & Vision

**MentaBot** is an empathetic, student-centered AI companion designed to provide supportive guidance for students facing academic pressure, productivity challenges, exam anxiety, and daily campus stress. 

The core requirement of this project is a **real, working Large Language Model (LLM) integration**. MentaBot strictly avoids simulated, hardcoded, or random chatbot responses. All conversational responses are generated dynamically through a secure backend architecture connecting to a verified LLM provider.

---

## 2. Core Architecture

The system operates across a secure multi-tier architecture:

```
[React Frontend]
       │
       ▼ (HTTP / JSON / CORS)
  [Flask API]
       │
       ▼ (Internal Service Call)
  [LLM Service Module]
       │
       ▼ (Official Google GenAI SDK / HTTPS)
[Google Gemini API (gemini-2.5-flash)]
       │
       ▼ (Dynamic LLM Response)
  [Flask API]
       │
       ▼ (JSON payload)
[React Chat Interface]
```

### Key Architectural Constraints
- **Zero Frontend Secret Exposure:** The React client never contacts LLM provider APIs directly. Secret API credentials reside exclusively on the server loaded via environment variables (`.env`).
- **Framework Separation & Coexistence:** The Flask backend provides lightweight, dedicated REST endpoints for the LLM chat (`/api/chat`, `/api/health`, `/api/status`, `/api/chat/reset`). The existing Django backend continues to run its sensor and user session features independently without regression.

---

## 3. Student-Support Persona & Ethical Boundaries

MentaBot adheres to clear behavioral and ethical guidelines:

### Supported Topics
1. **Academic Pressure & Study Planning:** Structuring revision schedules, breaking large syllabi into manageable chunks, balancing coursework.
2. **Time Management & Productivity:** Implementing Pomodoro intervals, overcoming procrastination, prioritization frameworks (e.g., Eisenhower matrix).
3. **Emotional Encouragement & Reflection:** Non-judgmental active listening, stress relief techniques, grounding exercises, positive self-talk.
4. **Exam Preparation Habits:** Sleep hygiene before exams, active recall techniques, managing test anxiety.

### Non-Negotiable Safety & Medical Boundaries
- **AI Identity:** Must state clearly that it is an artificial intelligence assistant, never pretending to be a human, licensed counselor, or physician.
- **No Medical Diagnoses:** Must never diagnose mental health conditions, prescribe psychiatric medications, or present emotion/stress measurements as clinical facts.
- **Crisis Routing:** If a student mentions severe depression, self-harm, suicidal ideation, or personal danger, MentaBot immediately directs them with empathy to human support services (such as campus wellness centers, trusted adults, or crisis helplines like **988**).

---

## 4. Functional Specifications

### 4.1 Backend Endpoints (`flask_backend/app.py`)
- `GET /api/health`: Returns server status and whether LLM provider is configured.
- `GET /api/status`: Returns provider name (`google-gemini`), configured model (`gemini-2.5-flash`), and readiness state (`Connected` vs `Not Connected`).
- `POST /api/chat`: Accepts `{ "message": string, "history": [{ role: string, content: string }] }`. Validates input length (<=2000 chars), non-empty content, and formats conversation history into SDK turns. Returns `{ "response": string, "provider": string, "model": string, "llm_enabled": true }`.
  - When API key is absent: returns `HTTP 503` with `{ "error": "LLM_NOT_CONFIGURED", "status": "Not Connected", "llm_enabled": false }`.
  - When API key is invalid: returns `HTTP 401` with descriptive error.
  - When rate limited: returns `HTTP 429`.
- `POST /api/chat/reset`: Clears conversation session context.

### 4.2 React Chat Interface (`frontend/src/`)
- Natural language messaging with auto-expanding textarea and character counter.
- Distinct bubble styling for user (indigo gradient) and MentaBot (slate dark card with bot avatar).
- Real-time loading indicator with animated pulsing typing dots.
- Live backend connection badge (`Real AI Connected`, `Not Connected (API Key Required)`, or `Backend Offline`).
- Prompt pills for instant student questions.
- "New Chat" reset action.
- Prominent crisis helpline notice and disclaimer banner.
- No silent fallback: when the LLM service is disconnected or failing, the interface explicitly marks the state as **Not Connected** rather than displaying fake bot replies.

---

## 5. Privacy & Security Rules

1. **Token & Context Limits:** Conversation history sent to the LLM is strictly capped to the last `MAX_HISTORY_TURNS` (default: 10 user/assistant turns) to protect token budget and privacy.
2. **Secret Management:** `.env` files are ignored by git via `.gitignore`. An `.env.example` file is provided with empty placeholders.
3. **Transient Memory:** Messages in the Flask LLM service are processed in-flight and not persisted permanently to unencrypted storage without explicit user consent.
