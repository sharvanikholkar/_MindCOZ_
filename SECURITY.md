# Security & Safety Policy (SECURITY.md)

## 1. Credential Management & API Key Hygiene
- **Server-Side Isolation:** The Google Gemini API key (`GEMINI_API_KEY`) is stored strictly on the server side and loaded via environment variables using `python-dotenv`.
- **Zero Frontend Secret Leaks:** No secret keys or authentication tokens are embedded in frontend source code, environment variables prefixed with `VITE_`, or bundled assets.
- **Git Protection:** `.gitignore` explicitly prevents `.env`, `.env.*`, and private configuration files from being tracked or committed to version control. An `.env.example` file contains placeholders only.

## 2. Conversation Privacy & Data Minimization
- **Context Window Limiting:** The backend limits context history sent to the LLM to the last `MAX_HISTORY_TURNS` (default: 10 conversational turns). This prevents uncontrolled token consumption and avoids sending excessive context.
- **In-Memory / In-Flight Processing:** Chat interactions through the Flask service are processed dynamically in memory and are not permanently logged to insecure, unencrypted external files.
- **Student Data Safety:** MentaBot does not collect personal identifiers (such as student ID numbers, phone numbers, home addresses, or financial data).

## 3. Input Validation & Abuse Mitigation
- **Length Constraints:** Incoming messages are capped at 2,000 characters to prevent prompt bloat and Denial of Service (DoS) attacks.
- **Payload Validation:** Strict JSON schema validation verifies message presence, rejects malformed payloads (`HTTP 400` / `415`), and rejects non-string types.
- **Rate Limit Handling:** Rate limit signals (`HTTP 429`) from the upstream LLM provider are captured and returned to the client with advisory guidance to wait before resending.

## 4. Ethical Boundaries & Non-Medical Disclaimer
- **AI Transparency:** MentaBot explicitly identifies itself as an artificial intelligence companion.
- **Medical Disclaimer:** MentaBot is not a physician, psychologist, or healthcare provider. It never provides medical diagnoses, psychiatric evaluations, or treatment plans.
- **Emergency / Crisis Protocol:** Any expression of crisis, acute distress, or self-harm triggers a built-in compassionate directive prompting the student to immediately contact emergency services, campus counselors, or suicide & crisis helplines (e.g., **988**).
