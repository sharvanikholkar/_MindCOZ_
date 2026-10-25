import logging
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import cv2
from .config import Config
from .llm_service import LLMService

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s in %(name)s: %(message)s"
)
logger = logging.getLogger("mentabot_api")

def create_app(test_config=None):
    app = Flask(__name__)

    # Apply any test configuration if test_config:
    if test_config:
        app.config.update(test_config)

    # Enable CORS for frontend clients
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    llm_service = LLMService(
        api_key=app.config.get("GEMINI_API_KEY", Config.GEMINI_API_KEY),
        model=app.config.get("GEMINI_MODEL", Config.GEMINI_MODEL)
    )

    # In-memory sensor state for real-time readings
    sensor_state = {
        "heart_rate": 75.0,
        "spo2": 98.2,
        "source": "Initial Baseline",
        "updated_at": "Just now",
        "available": True,
    }

    @app.route("/api/health", methods=["GET"])
    def health_check():
        """Backend health check endpoint."""
        status_info = llm_service.get_status()
        return jsonify({
            "status": "ok",
            "service": "MentaBot Flask Backend",
            "llm_status": status_info["status"],
            "llm_configured": status_info["configured"]
        }), 200

    @app.route("/api/status", methods=["GET"])
    def llm_status():
        """Returns the current LLM integration configuration status."""
        return jsonify(llm_service.get_status()), 200

    @app.route("/api/chat", methods=["POST"])
    def chat_endpoint():
        """
        Main chat endpoint for student interactions.
        Accepts: {"message": str, "history": [{"role": str, "content": str}, ...]}
        """
        if not request.is_json:
            return jsonify({
                "error": "BAD_REQUEST",
                "message": "Content-Type must be application/json"
            }), 415

        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({
                "error": "BAD_REQUEST",
                "message": "Request body must be a valid JSON object"
            }), 400

        message = data.get("message")
        if not isinstance(message, str) or not message.strip():
            return jsonify({
                "error": "INVALID_INPUT",
                "message": "Field 'message' must be a non-empty string"
            }), 400

        message = message.strip()
        if len(message) > Config.MAX_MESSAGE_LENGTH:
            return jsonify({
                "error": "MESSAGE_TOO_LONG",
                "message": f"Message exceeds limit of {Config.MAX_MESSAGE_LENGTH} characters"
            }), 400

        history = data.get("history", [])
        if not isinstance(history, list):
            return jsonify({
                "error": "INVALID_INPUT",
                "message": "Field 'history' must be a list of message objects"
            }), 400

        # Execute LLM generation
        result = llm_service.generate_response(message=message, history=history)
        if result.get("success"):
            return jsonify({
                "response": result["response"],
                "provider": result.get("provider", "google-gemini"),
                "model": result.get("model", Config.GEMINI_MODEL),
                "llm_enabled": True
            }), 200

        # Map error types to standard HTTP status codes
        error_code = result.get("error_code")
        if error_code == "LLM_NOT_CONFIGURED":
            return jsonify({
                "error": error_code,
                "message": result.get("message"),
                "status": "Not Connected",
                "llm_enabled": False
            }), 503

        if error_code == "INVALID_API_KEY":
            return jsonify({
                "error": error_code,
                "message": result.get("message"),
                "status": "Invalid API Key",
                "llm_enabled": False
            }), 401

        if error_code == "RATE_LIMIT_EXCEEDED":
            return jsonify({
                "error": error_code,
                "message": result.get("message"),
                "llm_enabled": True
            }), 429

        if error_code in ("INVALID_INPUT", "MESSAGE_TOO_LONG"):
            return jsonify({
                "error": error_code,
                "message": result.get("message"),
                "llm_enabled": True
            }), 400

        # Provider or network failure
        return jsonify({
            "error": error_code or "LLM_PROVIDER_ERROR",
            "message": result.get("message", "An error occurred while contacting the LLM provider."),
            "llm_enabled": result.get("llm_enabled", False)
        }), 502

    @app.route("/api/sensor", methods=["GET", "POST"])
    def sensor_endpoint():
        """Gets or updates live sensor reading."""
        if request.method == "POST":
            data = request.get_json(silent=True) or {}
            hr = data.get("heart_rate")
            spo2 = data.get("spo2")

            if hr is not None:
                try:
                    sensor_state["heart_rate"] = round(float(hr), 1)
                except (ValueError, TypeError):
                    pass
            if spo2 is not None:
                try:
                    sensor_state["spo2"] = round(float(spo2), 1)
                except (ValueError, TypeError):
                    pass

            sensor_state["source"] = data.get("source", "User Input / Device")
            sensor_state["updated_at"] = "Just now"
            sensor_state["available"] = True
            return jsonify({
                "status": "success",
                "reading": sensor_state
            }), 200

        return jsonify({
            "available": True,
            "status": "available",
            "reading": sensor_state
        }), 200

    @app.route("/api/camera", methods=["GET"])
    def laptop_camera_stream():
        """Stream the built‑in laptop webcam as MJPEG. Uses OpenCV to capture frames from device 0."""
        def generate_frames():
            cap = cv2.VideoCapture(0)
            if not cap.isOpened():
                logger.error("Cannot open laptop webcam (device 0)")
                return
            try:
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        break
                    ret, buffer = cv2.imencode('.jpg', frame)
                    if not ret:
                        continue
                    frame_bytes = buffer.tobytes()
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            finally:
                cap.release()

        return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

    @app.route("/api/proxy/fetch", methods=["GET"])
    def proxy_fetch():
        """Proxies GET requests to local network ESP32 or sensor IPs to bypass browser CORS."""
        target_url = request.args.get("url", "").strip()
        if not target_url:
            return jsonify({"error": "Missing 'url' query parameter"}), 400

        import urllib.request
        try:
            req = urllib.request.Request(
                target_url,
                headers={"User-Agent": "MindCoZ-Backend/1.0", "Accept": "application/json, text/plain, */*"}
            )
            with urllib.request.urlopen(req, timeout=3.5) as response:
                content_type = response.headers.get("Content-Type", "")
                raw = response.read().decode("utf-8", errors="replace")
                if "application/json" in content_type:
                    import json
                    return jsonify(json.loads(raw)), 200
                return jsonify({"status": "ok", "raw": raw}), 200
        except Exception as exc:
            return jsonify({"error": "PROXY_FAILED", "message": str(exc)}), 502

    @app.route("/api/chat/reset", methods=["POST"])
    def reset_conversation():
        """Resets or signals a fresh conversation session."""
        return jsonify({
            "status": "reset",
            "message": "Conversation session cleared."
        }), 200

    @app.errorhandler(404)
    def handle_not_found(e):
        return jsonify({"error": "NOT_FOUND", "message": "Requested endpoint does not exist"}), 404

    @app.errorhandler(405)
    def handle_method_not_allowed(e):
        return jsonify({"error": "METHOD_NOT_ALLOWED", "message": "HTTP method not allowed"}), 405

    return app

# Generate the app instance out here for module-level imports (like from __init__.py)
app = create_app()

if __name__ == "__main__":
    logger.info(f"Starting MentaBot Flask Backend on port {Config.PORT}...")
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
