import React from 'react';
import Message from './Message';
import type { MessageProps } from '../types/components';
import '../styles/Message.css';

/**
 * UserMessage component for displaying user messages
 * Extends base Message component with right-aligned styling and blue background
 */
const UserMessage: React.FC<MessageProps> = ({ message, messageIndex, totalMessages, onRetry }) => {
  // Ensure this component only renders user messages
  if (message.sender !== 'user') {
    console.warn('UserMessage component should only be used for user messages');
    return <Message message={message} messageIndex={messageIndex} totalMessages={totalMessages} onRetry={onRetry} />;
  }

  // Create accessible label for user message
  const getMessageLabel = (): string => {
    const positionText = messageIndex && totalMessages 
      ? ` (message ${messageIndex} of ${totalMessages})` 
      : '';
    return `You said${positionText}: ${message.content}`;
  };

  return (
    <div 
      className="message-wrapper user user-message"
      role="article"
      aria-label={getMessageLabel()}
      tabIndex={0}
    >
      <div className="message-bubble user">
        <div className="message-content">
          {message.content}
        </div>
        {message.status === 'error' && onRetry && (
          <div className="message-meta">
            <button
              className="retry-button"
              onClick={() => onRetry(message.id)}
              aria-label="Retry sending this message"
              title="Click to retry sending this message"
            >
              <span className="retry-icon" aria-hidden="true">↻</span>
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserMessage;