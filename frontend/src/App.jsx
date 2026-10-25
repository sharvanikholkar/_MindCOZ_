import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import PulseSensorSection from './components/PulseSensorSection';
import Esp32CamSection from './components/Esp32CamSection';
import ChatMessageList from './components/ChatMessageList';
import SuggestedTopics from './components/SuggestedTopics';
import ChatInput from './components/ChatInput';
import CrisisFooter from './components/CrisisFooter';
import { getLLMStatus, sendChatMessage, resetConversationSession } from './services/api';
import { Bot, ChevronDown, ChevronUp } from 'lucide-react';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pulse' | 'cam' | 'chat'
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(true);
  const [statusInfo, setStatusInfo] = useState({
    configured: false,
    provider: 'google-gemini',
    model: 'gemini-2.5-flash',
    status: 'Checking...',
    message: 'Connecting to backend...',
  });
  const [errorBanner, setErrorBanner] = useState(null);

  const chatBottomRef = useRef(null);

  const updateStatus = useCallback((status) => {
    setStatusInfo(status);

    if (!status.configured && status.status === 'Not Connected') {
      setErrorBanner({
        title: 'Real LLM Integration: API Key Required',
        message: status.message || 'The backend requires a valid GEMINI_API_KEY in flask_backend/.env to generate AI responses.',
        action: 'Tip: Add GEMINI_API_KEY to flask_backend/.env and restart Flask. MentaBot will never generate fake simulated responses.',
      });
    } else if (status.status === 'Offline') {
      setErrorBanner({
        title: 'Backend Unreachable',
        message: 'Could not connect to the Flask backend server on port 5000.',
        action: 'Ensure Flask is running: `python -m flask_backend.app`',
      });
    } else {
      setErrorBanner(null);
    }
  }, []);

  const checkStatus = useCallback(async () => {
    const status = await getLLMStatus();
    updateStatus(status);
  }, [updateStatus]);

  // Check status on startup
  useEffect(() => {
    let ignore = false;
    getLLMStatus().then((status) => {
      if (!ignore) {
        updateStatus(status);
      }
    });
    return () => {
      ignore = true;
    };
  }, [updateStatus]);

  const handleSendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    // Ensure chat panel is open
    setIsChatExpanded(true);

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userTurn = { role: 'user', content: text.trim(), timestamp };

    const newMessages = [...messages, userTurn];
    setMessages(newMessages);
    setIsLoading(true);
    setErrorBanner(null);

    // Send history to backend
    const result = await sendChatMessage(text.trim(), messages);
    setIsLoading(false);

    if (result.success) {
      const assistantTurn = {
        role: 'assistant',
        content: result.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: result.model || statusInfo.model,
        provider: result.provider || 'google-gemini',
      };
      setMessages([...newMessages, assistantTurn]);
      setStatusInfo(prev => ({
        ...prev,
        configured: true,
        status: 'Connected',
        model: result.model || prev.model,
      }));
    } else {
      let actionHint = '';
      if (result.statusCode === 503 || result.error === 'LLM_NOT_CONFIGURED') {
        actionHint = 'Add GEMINI_API_KEY to flask_backend/.env and restart the Flask server. Simulated fallback responses are strictly disabled.';
        setStatusInfo(prev => ({ ...prev, configured: false, status: 'Not Connected' }));
      } else if (result.statusCode === 429) {
        actionHint = 'Please pause for 30 seconds before sending your next question.';
      } else if (result.statusCode === 401) {
        actionHint = 'Please check that the GEMINI_API_KEY in flask_backend/.env is valid and active.';
      } else if (result.error === 'NETWORK_ERROR') {
        actionHint = 'Check that your Flask API backend is running on http://127.0.0.1:5000.';
        setStatusInfo(prev => ({ ...prev, status: 'Offline' }));
      }

      setErrorBanner({
        title: result.status === 'Not Connected' ? 'LLM Not Connected' : (result.error || 'Request Error'),
        message: result.message || 'Unable to generate response from the LLM service.',
        action: actionHint,
      });
    }

    // Scroll chat into view if needed
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleResetChat = async () => {
    setIsResetting(true);
    try {
      await resetConversationSession();
    } catch {
      // ignore
    }
    setMessages([]);
    setErrorBanner(null);
    setIsResetting(false);
    checkStatus();
  };

  const handleConsultAI = (promptText) => {
    setActiveTab('all');
    setIsChatExpanded(true);
    handleSendMessage(promptText);
    setTimeout(() => {
      const chatElem = document.getElementById('ai-companion-section');
      if (chatElem) {
        chatElem.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <div className="mentabot-app mindcoz-app">
      <Header
        statusInfo={statusInfo}
        onResetChat={handleResetChat}
        isResetting={isResetting}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      <main className="main-content-flow">
        {/* SECTION 1: PULSE SENSOR & HEART RATE TELEMETRY */}
        {(activeTab === 'all' || activeTab === 'pulse') && (
          <div className="telemetry-section-container">
            <PulseSensorSection onConsultAI={handleConsultAI} />
          </div>
        )}

        {/* SECTION 2: ESP32-CAM VIDEO STREAM & OPTICAL MODULE */}
        {(activeTab === 'all' || activeTab === 'cam') && (
          <div className="telemetry-section-container">
            <Esp32CamSection />
          </div>
        )}

        {/* SECTION 3: MENTABOT AI COMPANION (COLLAPSIBLE / INTEGRATED ON SAME PAGE) */}
        {(activeTab === 'all' || activeTab === 'chat') && (
          <section className="sensor-card chat-integration-section" id="ai-companion-section">
            <div className="section-card-header chat-section-toggle" onClick={() => setIsChatExpanded(!isChatExpanded)}>
              <div className="section-title-wrap">
                <div className="section-icon-badge bg-violet-500/15 text-violet-400">
                  <Bot size={22} />
                </div>
                <div>
                  <h2 className="section-heading">MentaBot AI Student Companion & Telemetry Advisor</h2>
                  <p className="section-subheading">
                    Empathetic AI guidance analyzing study fatigue, exam stress & pulse vitals
                  </p>
                </div>
              </div>

              <div className="section-header-actions">
                <button
                  type="button"
                  className="btn-toggle-chat"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsChatExpanded(!isChatExpanded);
                  }}
                  title={isChatExpanded ? 'Collapse AI panel' : 'Expand AI panel'}
                >
                  {isChatExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  <span>{isChatExpanded ? 'Minimize Chat' : 'Expand Chat'}</span>
                </button>
              </div>
            </div>

            {isChatExpanded && (
              <div className="chat-body-content">
                <ChatMessageList
                  messages={messages}
                  isLoading={isLoading}
                  errorBanner={errorBanner}
                />

                <div className="chat-bottom-controls" ref={chatBottomRef}>
                  <SuggestedTopics
                    onSelectPrompt={handleSendMessage}
                    disabled={isLoading}
                  />
                  <ChatInput
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                    disabled={statusInfo.status === 'Offline'}
                  />
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      <CrisisFooter />
    </div>
  );
}
