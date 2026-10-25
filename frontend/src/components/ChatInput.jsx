import React, { useState, useRef } from 'react';
import { Send } from 'lucide-react';

const MAX_CHARS = 2000;

export default function ChatInput({ onSendMessage, isLoading, disabled }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!text.trim() || isLoading || disabled) return;
    onSendMessage(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    if (val.length <= MAX_CHARS) {
      setText(val);
      // Auto-grow textarea
      e.target.style.height = 'auto';
      e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
    }
  };

  return (
    <form className="chat-input-form" onSubmit={handleSubmit}>
      <div className="input-box-wrapper">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask MentaBot about study tips, time management, or coping with academic stress... (Shift+Enter for new line)"
          rows={1}
          disabled={disabled || isLoading}
          className="chat-textarea"
        />

        <div className="input-toolbar">
          <span className={`char-counter ${text.length > 1800 ? 'char-counter-warn' : ''}`}>
            {text.length}/{MAX_CHARS}
          </span>
          <button
            type="submit"
            disabled={!text.trim() || isLoading || disabled}
            className="btn-send"
            title="Send message (Enter)"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </form>
  );
}
