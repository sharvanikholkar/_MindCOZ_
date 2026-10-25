import React from 'react';
import { 
  Bot, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  Heart, 
  Camera, 
  LayoutDashboard, 
  Activity
} from 'lucide-react';

export default function Header({ 
  statusInfo, 
  onResetChat, 
  isResetting,
  activeTab = 'all',
  onSelectTab
}) {
  const getBadge = () => {
    if (statusInfo.configured && statusInfo.status === 'Connected') {
      return (
        <span className="badge badge-connected" title={`Provider: ${statusInfo.provider} | Model: ${statusInfo.model}`}>
          <CheckCircle2 size={14} className="badge-icon text-emerald-400" />
          <span>Real AI Connected</span>
        </span>
      );
    }
    if (statusInfo.status === 'Offline') {
      return (
        <span className="badge badge-offline" title={statusInfo.message}>
          <AlertCircle size={14} className="badge-icon text-rose-400" />
          <span>Backend Offline</span>
        </span>
      );
    }
    return (
      <span className="badge badge-warning" title={statusInfo.message || 'API Key Required'}>
        <AlertCircle size={14} className="badge-icon text-amber-400" />
        <span>API Key Required</span>
      </span>
    );
  };

  return (
    <header className="chat-header main-app-header">
      <div className="header-brand">
        <div className="avatar-brand">
          <Activity size={26} className="text-white" />
        </div>
        <div>
          <div className="title-row">
            <h1 className="header-title">MindCoZ</h1>
            <span className="tag-ai">Sensor Telemetry & AI Hub</span>
          </div>
          <p className="header-subtitle">
            Pulse Sensor Vitals + ESP32-CAM Optical Stream + MentaBot AI
          </p>
        </div>
      </div>

      {/* Navigation Pills to jump between or focus sections on same page */}
      <nav className="header-nav-tabs">
        <button
          type="button"
          className={`nav-tab-pill ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => onSelectTab && onSelectTab('all')}
        >
          <LayoutDashboard size={14} />
          <span>Dual Sensor View</span>
        </button>

        <button
          type="button"
          className={`nav-tab-pill ${activeTab === 'pulse' ? 'active' : ''}`}
          onClick={() => onSelectTab && onSelectTab('pulse')}
        >
          <Heart size={14} className="text-rose-400" />
          <span>Pulse Sensor</span>
        </button>

        <button
          type="button"
          className={`nav-tab-pill ${activeTab === 'cam' ? 'active' : ''}`}
          onClick={() => onSelectTab && onSelectTab('cam')}
        >
          <Camera size={14} className="text-sky-400" />
          <span>ESP32-CAM</span>
        </button>

        <button
          type="button"
          className={`nav-tab-pill ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => onSelectTab && onSelectTab('chat')}
        >
          <Bot size={14} className="text-violet-400" />
          <span>AI Companion</span>
        </button>
      </nav>

      <div className="header-actions">
        {getBadge()}
        <button
          type="button"
          onClick={onResetChat}
          disabled={isResetting}
          className="btn-reset"
          title="Reset active chat session"
        >
          <RotateCcw size={15} className={isResetting ? 'spin' : ''} />
          <span>New Chat</span>
        </button>
      </div>
    </header>
  );
}
