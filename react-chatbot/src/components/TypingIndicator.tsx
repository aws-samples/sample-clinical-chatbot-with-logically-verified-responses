import React from 'react';
import type { TypingIndicatorProps } from '../types/components';
import '../styles/TypingIndicator.css';

/**
 * TypingIndicator component that shows an animated indicator when the assistant is generating a response
 * Features smooth show/hide transitions and proper positioning to match assistant message alignment
 */

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ 
  isVisible, 
  className = '' 
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className={`typing-indicator-wrapper ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Assistant is typing"
    >
      <div className="typing-indicator-bubble">
        <div className="typing-dots" aria-hidden="true">
          <span className="typing-dot"></span>
          <span className="typing-dot"></span>
          <span className="typing-dot"></span>
        </div>
        <span className="sr-only">Assistant is typing a response</span>
      </div>
    </div>
  );
};

export default TypingIndicator;