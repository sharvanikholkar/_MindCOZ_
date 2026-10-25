import unittest
from unittest.mock import MagicMock, patch
from flask_backend.app import create_app
from flask_backend.llm_service import LLMService


class TestFlaskLLMBackend(unittest.TestCase):
    def setUp(self):
        self.app = create_app({
            "TESTING": True,
            "GEMINI_API_KEY": "",  # Unconfigured by default in tests
            "GEMINI_MODEL": "gemini-2.5-flash"
        })
        self.client = self.app.test_client()

    def test_health_endpoint(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data.get("status"), "ok")
        self.assertIn("llm_configured", data)

    def test_status_endpoint_unconfigured(self):
        response = self.client.get("/api/status")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertFalse(data.get("configured"))
        self.assertEqual(data.get("status"), "Not Connected")
        self.assertEqual(data.get("provider"), "google-gemini")

    def test_chat_non_json(self):
        response = self.client.post("/api/chat", data="not json", content_type="text/plain")
        self.assertEqual(response.status_code, 415)

    def test_chat_missing_message(self):
        response = self.client.post("/api/chat", json={})
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertEqual(data.get("error"), "INVALID_INPUT")

    def test_chat_empty_string_message(self):
        response = self.client.post("/api/chat", json={"message": "   "})
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertEqual(data.get("error"), "INVALID_INPUT")

    def test_chat_oversized_message(self):
        long_message = "A" * 2001
        response = self.client.post("/api/chat", json={"message": long_message})
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertEqual(data.get("error"), "MESSAGE_TOO_LONG")

    def test_chat_invalid_history_format(self):
        response = self.client.post("/api/chat", json={"message": "Hello", "history": "not-a-list"})
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertEqual(data.get("error"), "INVALID_INPUT")

    def test_chat_unconfigured_credentials(self):
        # When GEMINI_API_KEY is not set, must return 503 with Not Connected
        response = self.client.post("/api/chat", json={"message": "I am feeling stressed about exams"})
        self.assertEqual(response.status_code, 503)
        data = response.get_json()
        self.assertEqual(data.get("status"), "Not Connected")
        self.assertEqual(data.get("error"), "LLM_NOT_CONFIGURED")
        self.assertFalse(data.get("llm_enabled"))

    def test_chat_successful_llm_response_mocked(self):
        configured_app = create_app({
            "TESTING": True,
            "GEMINI_API_KEY": "fake-test-key-for-mocking",
            "GEMINI_MODEL": "gemini-2.5-flash"
        })
        test_client = configured_app.test_client()

        mock_response = MagicMock()
        mock_response.text = "Hello! I am MentaBot. Break your study time into 25-minute Pomodoro intervals."

        with patch("flask_backend.llm_service.genai.Client") as mock_client_cls:
            mock_client_instance = MagicMock()
            mock_client_cls.return_value = mock_client_instance
            mock_client_instance.models.generate_content.return_value = mock_response

            # Also patch the existing client instance on the view service if already initialized
            with patch.object(LLMService, "generate_response", return_value={
                "success": True,
                "response": "Hello! I am MentaBot. Break your study time into 25-minute Pomodoro intervals.",
                "provider": "google-gemini",
                "model": "gemini-2.5-flash",
                "llm_enabled": True
            }):
                response = test_client.post("/api/chat", json={
                    "message": "How do I study for my biology exam?",
                    "history": [
                        {"role": "user", "content": "Hi"},
                        {"role": "assistant", "content": "Hello! How can I support your studies today?"}
                    ]
                })

                self.assertEqual(response.status_code, 200)
                data = response.get_json()
                self.assertTrue(data.get("llm_enabled"))
                self.assertIn("Pomodoro", data.get("response"))
                self.assertEqual(data.get("provider"), "google-gemini")

    def test_chat_reset_endpoint(self):
        response = self.client.post("/api/chat/reset")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data.get("status"), "reset")

    def test_chat_invalid_api_key_error(self):
        with patch.object(LLMService, "generate_response", return_value={
            "success": False,
            "error_code": "INVALID_API_KEY",
            "message": "Invalid Gemini API key provided. Please verify your credentials.",
            "llm_enabled": False
        }):
            response = self.client.post("/api/chat", json={"message": "Help me study"})
            self.assertEqual(response.status_code, 401)
            data = response.get_json()
            self.assertEqual(data.get("error"), "INVALID_API_KEY")
            self.assertEqual(data.get("status"), "Invalid API Key")
    def test_sensor_get(self):
        response = self.client.get("/api/sensor")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data.get("available"))
        self.assertIn("reading", data)
        self.assertIn("heart_rate", data["reading"])

    def test_sensor_post(self):
        response = self.client.post("/api/sensor", json={"heart_rate": 88, "spo2": 99.1, "source": "Unit Test"})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data.get("status"), "success")
        self.assertEqual(data["reading"]["heart_rate"], 88.0)
        self.assertEqual(data["reading"]["spo2"], 99.1)

    def test_proxy_fetch_missing_url(self):
        response = self.client.get("/api/proxy/fetch")
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
