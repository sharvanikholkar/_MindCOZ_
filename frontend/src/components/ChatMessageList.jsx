import React, { useRef, useEffect } from 'react';
import { Bot, User, AlertTriangle, ShieldCheck } from 'lucide-react';

function FormattedContent({ text }) {
  // Simple markdown-style formatter for paragraphs, lists, and bold text
  const paragraphs = text.split('\n\n');

  return (
    <div className="message-text">
      {paragraphs.map((p, idx) => {
        const lines = p.split('\n');
        const isList = lines.every(line => line.trim().startsWith('* ') || line.trim().startsWith('- ') || /^\d+\./.test(line.trim()));

        if (isList) {
          return (
            <ul key={idx} className="message-list">
              {lines.map((line, lIdx) => {
                const clean = line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
                return <li key={lIdx}>{formatInline(clean)}</li>;
              })}
            </ul>
          );
        }

        return (
          <p key={idx} className="message-p">
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {formatInline(line)}
                {lIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function formatInline(str) {
  // Bold **text**
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function ChatMessageList({ messages, isLoading, errorBanner }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, errorBanner]);

  return (
    <div className="messages-container" ref={scrollRef}>
      {messages.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Bot size={40} />
          </div>
          <h2>Welcome to MentaBot!</h2>
          <p>
            I am here to help you navigate academic pressure, organize your study habits,
            manage time effectively, and find constructive balance in student life.
          </p>
          <div className="empty-state-notice">
            <ShieldCheck size={16} className="text-emerald-500" />
            <span>MentaBot is an AI assistant, not a clinical doctor. Your privacy and wellness come first.</span>
          </div>
        </div>
      )}

      {messages.map((msg, index) => {
        const isUser = msg.role === 'user';
        return (
          <div
            key={index}
            className={`message-row ${isUser ? 'message-row-user' : 'message-row-assistant'}`}
          >
            <div className={`message-avatar ${isUser ? 'avatar-user' : 'avatar-bot'}`}>
              {isUser ? <User size={18} /> : <Bot size={18} />}
            </div>

            <div className="message-bubble-wrapper">
              <div className="message-meta">
                <span className="message-sender">{isUser ? 'You' : 'MentaBot'}</span>
                <span className="message-time">{msg.timestamp || 'Just now'}</span>
                {!isUser && msg.model && (
                  <span className="model-pill">{msg.model}</span>
                )}
              </div>

              <div className={`message-bubble ${isUser ? 'bubble-user' : 'bubble-assistant'}`}>
                <FormattedContent text={msg.content} />
              </div>

              {!isUser && (
                <div className="message-disclaimer">
                  AI-generated response • For educational & student support purposes only
                </div>
              )}
            </div>
          </div>
        );
      })}

      {isLoading && (
        <div className="message-row message-row-assistant">
          <div className="message-avatar avatar-bot">
            <Bot size={18} />
          </div>
          <div className="message-bubble-wrapper">
            <div className="message-meta">
              <span className="message-sender">MentaBot</span>
              <span className="message-time">Generating response...</span>
            </div>
            <div className="message-bubble bubble-assistant bubble-loading">
              <span className="dot dot-1"></span>
              <span className="dot dot-2"></span>
              <span className="dot dot-3"></span>
            </div>
          </div>
        </div>
      )}

      {errorBanner && (
        <div className="chat-error-banner">
          <AlertTriangle size={20} className="error-icon" />
          <div className="error-body">
            <strong>{errorBanner.title || 'Error'}</strong>
            <p>{errorBanner.message}</p>
            {errorBanner.action && (
              <div className="error-action-hint">{errorBanner.action}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
