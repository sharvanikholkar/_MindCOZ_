import logging
from typing import List, Dict, Any, Optional

try:
    from google import genai
    from google.genai import types
    from google.genai.errors import APIError, ClientError, ServerError
except ImportError:
    genai = None
    types = None
    APIError = ClientError = ServerError = Exception

from .config import Config

logger = logging.getLogger(__name__)


class LLMService:
    """
    Dedicated LLM service interface for MentaBot.
    Connects to the official Google Gemini SDK (`google-genai`).
    Manages student-support persona prompt, conversation history formatting,
    token limits, and robust error handling.
    """

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = (api_key if api_key is not None else Config.GEMINI_API_KEY).strip()
        self.model = (model if model is not None else Config.GEMINI_MODEL).strip()
        self.max_history_turns = Config.MAX_HISTORY_TURNS
        self.system_instruction = Config.SYSTEM_INSTRUCTION
        self._client = None

        if self.is_configured:
            try:
                self._client = genai.Client(api_key=self.api_key)
            except Exception as exc:
                logger.error(f"Failed to initialize Gemini client: {exc}")
                self._client = None

    @property
    def is_configured(self) -> bool:
        """Returns True if the API key is present, not a placeholder, and SDK is available."""
        if not self.api_key or genai is None:
            return False
        placeholders = ("your_gemini_api_key", "your_actual", "placeholder", "your_api_key")
        if any(p in self.api_key.lower() for p in placeholders):
            return False
        return True

    def get_status(self) -> Dict[str, Any]:
        """Returns the readiness status of the LLM service."""
        if not genai:
            return {
                "configured": False,
                "provider": "google-gemini",
                "model": self.model,
                "status": "Not Connected",
                "message": "google-genai SDK package is not installed."
            }
        if not self.is_configured:
            return {
                "configured": False,
                "provider": "google-gemini",
                "model": self.model,
                "status": "Not Connected",
                "message": "GEMINI_API_KEY is not set. Please provide your actual API key in flask_backend/.env."
            }
        return {
            "configured": True,
            "provider": "google-gemini",
            "model": self.model,
            "status": "Connected",
            "message": f"Real LLM integration active with model {self.model}."
        }

    def _format_conversation(self, message: str, history: Optional[List[Dict[str, str]]] = None) -> List[Any]:
        """
        Formats conversation history and current user turn into Gemini Content items.
        Respects configurable token/turn limits.
        """
        contents = []

        if history and isinstance(history, list):
            # Limit history to the last N turns (user + assistant pairs)
            max_items = self.max_history_turns * 2
            trimmed_history = history[-max_items:]

            for item in trimmed_history:
                if not isinstance(item, dict):
                    continue
                role = item.get("role", "")
                text = item.get("content", "").strip()
                if not text:
                    continue

                gemini_role = "model" if role in ("assistant", "model", "bot") else "user"
                contents.append(
                    types.Content(
                        role=gemini_role,
                        parts=[types.Part.from_text(text=text)]
                    )
                )

        # Append current user message
        contents.append(
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=message.strip())]
            )
        )
        return contents

    def generate_response(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Calls the real Gemini LLM with the user message and conversation context.
        Returns a dictionary with result metadata or explicit error details.
        """
        if not self.is_configured:
            return {
                "success": False,
                "error_code": "LLM_NOT_CONFIGURED",
                "message": (
                    "Real LLM is Not Connected. GEMINI_API_KEY is missing from backend environment. "
                    "Please set GEMINI_API_KEY in flask_backend/.env to enable AI responses."
                ),
                "status": "Not Connected",
                "llm_enabled": False
            }

        if not message or not message.strip():
            return {
                "success": False,
                "error_code": "INVALID_INPUT",
                "message": "Message cannot be empty.",
                "llm_enabled": False
            }

        if len(message) > Config.MAX_MESSAGE_LENGTH:
            return {
                "success": False,
                "error_code": "MESSAGE_TOO_LONG",
                "message": f"Message exceeds maximum allowed length of {Config.MAX_MESSAGE_LENGTH} characters.",
                "llm_enabled": False
            }

        try:
            contents = self._format_conversation(message, history)

            generation_config = types.GenerateContentConfig(
                system_instruction=self.system_instruction,
                temperature=0.7,
                max_output_tokens=1024,
            )

            client = self._client or genai.Client(api_key=self.api_key)
            response = client.models.generate_content(
                model=self.model,
                contents=contents,
                config=generation_config
            )

            generated_text = ""
            if response and hasattr(response, "text") and response.text:
                generated_text = response.text.strip()
            elif response and hasattr(response, "candidates") and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, "content") and candidate.content and candidate.content.parts:
                    generated_text = candidate.content.parts[0].text.strip()

            if not generated_text:
                return {
                    "success": False,
                    "error_code": "EMPTY_RESPONSE",
                    "message": "The LLM provider returned an empty response. Please try again.",
                    "llm_enabled": True
                }

            return {
                "success": True,
                "response": generated_text,
                "provider": "google-gemini",
                "model": self.model,
                "llm_enabled": True
            }

        except ClientError as exc:
            logger.error(f"Gemini ClientError: {exc}")
            error_str = str(exc)
            if "API_KEY_INVALID" in error_str or "PERMISSION_DENIED" in error_str:
                msg = "Invalid Gemini API key provided. Please verify your credentials."
                code = "INVALID_API_KEY"
            elif "RESOURCE_EXHAUSTED" in error_str or "429" in error_str:
                msg = "LLM rate limit reached. Please wait a moment before sending another message."
                code = "RATE_LIMIT_EXCEEDED"
            else:
                msg = f"LLM client error: {error_str}"
                code = "LLM_CLIENT_ERROR"
            return {
                "success": False,
                "error_code": code,
                "message": msg,
                "llm_enabled": True
            }

        except ServerError as exc:
            logger.error(f"Gemini ServerError: {exc}")
            return {
                "success": False,
                "error_code": "LLM_SERVER_ERROR",
                "message": "The LLM provider is temporarily unavailable. Please try again shortly.",
                "llm_enabled": True
            }

        except Exception as exc:
            logger.error(f"Unexpected error in LLM service: {exc}", exc_info=True)
            return {
                "success": False,
                "error_code": "LLM_CALL_FAILED",
                "message": f"Unable to reach LLM service: {str(exc)}",
                "llm_enabled": True
            }
