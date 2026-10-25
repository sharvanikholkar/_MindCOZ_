/**
 * MentaBot Frontend API Service
 * Dedicated service module to communicate with the Flask LLM backend.
 * All secret credentials remain on the backend; the frontend communicates
 * strictly through this API contract.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api';

/**
 * Checks backend health and connection.
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Health check returned status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    return {
      status: 'error',
      service: 'MentaBot Flask Backend',
      llm_status: 'Offline',
      llm_configured: false,
      error: error.message,
    };
  }
}

/**
 * Fetches LLM configuration status (provider, model, configured state).
 */
export async function getLLMStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/status`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Status check returned ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    return {
      configured: false,
      provider: 'google-gemini',
      status: 'Not Connected',
      message: 'Unable to connect to Flask backend. Please ensure the server is running.',
      error: error.message,
    };
  }
}

/**
 * Sends a message and conversation history to the real LLM endpoint.
 *
 * @param {string} message - Current student message.
 * @param {Array<{role: string, content: string}>} history - Previous messages.
 * @returns {Promise<{success: boolean, response?: string, error?: string, status?: string, llm_enabled?: boolean}>}
 */
export async function sendChatMessage(message, history = []) {
  if (!message || !message.trim()) {
    return {
      success: false,
      error: 'Message cannot be empty.',
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        message: message.trim(),
        history: history.map(item => ({
          role: item.role,
          content: item.content,
        })),
      }),
    });

    const data = await response.json().catch(() => ({
      error: 'PARSE_ERROR',
      message: 'Failed to parse JSON response from server.',
    }));

    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        error: data.error || 'API_ERROR',
        message: data.message || `Server returned error (${response.status})`,
        status: data.status || 'Error',
        llm_enabled: data.llm_enabled || false,
      };
    }

    return {
      success: true,
      response: data.response,
      provider: data.provider,
      model: data.model,
      llm_enabled: data.llm_enabled,
    };
  } catch {
    return {
      success: false,
      statusCode: 0,
      error: 'NETWORK_ERROR',
      message: 'Cannot reach the Flask backend at ' + API_BASE_URL + '. Is the server running?',
      status: 'Not Connected',
      llm_enabled: false,
    };
  }
}

/**
 * Requests backend conversation reset.
 */
export async function resetConversationSession() {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/reset`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
    });
    return await response.json();
  } catch (error) {
    return { status: 'reset', error: error.message };
  }
}

/**
 * Fetches sensor reading from selected source (flask, django, or custom direct IP).
 */
export async function fetchSensorReading(source = 'flask', customUrl = '') {
  try {
    let url = `${API_BASE_URL}/sensor`;
    if (source === 'django') {
      url = '/django-api/sensor';
    } else if (source === 'custom' && customUrl) {
      url = customUrl;
    }

    let response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
    } catch {
      // If direct fetch fails (e.g. CORS on raw ESP32 IP), attempt through backend proxy
      if (source === 'custom' && customUrl) {
        const proxyUrl = `${API_BASE_URL}/proxy/fetch?url=${encodeURIComponent(customUrl)}`;
        response = await fetch(proxyUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });
      } else {
        throw new Error('Connection failed');
      }
    }

    if (!response.ok) {
      throw new Error(`Sensor fetch returned ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      data: data.reading || data,
      raw: data,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Unable to fetch sensor reading',
    };
  }
}

/**
 * Posts an updated or simulated sensor reading to the Flask backend.
 */
export async function postSensorReading(heartRate, spo2, source = 'Simulated / Test Mode') {
  try {
    const response = await fetch(`${API_BASE_URL}/sensor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        heart_rate: heartRate,
        spo2,
        source,
      }),
    });
    const data = await response.json();
    return { success: response.ok, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
