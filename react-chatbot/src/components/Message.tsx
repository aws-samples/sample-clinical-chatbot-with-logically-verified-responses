import React from 'react';
import type { MessageProps } from '../types/components';
import '../styles/Message.css';

/**
 * Base Message component with common functionality
 * Provides reusable message display with timestamp, status indicators, and retry functionality
 */
const Message: React.FC<MessageProps> = ({ message, messageIndex, totalMessages, onRetry }) => {




  // Handle retry button click
  const handleRetry = () => {
    if (onRetry && message.status === 'error') {
      onRetry(message.id);
    }
  };

  // Helper function to get validation indicator
  const getValidationIndicator = (validationStatus?: string): string => {
    if (!validationStatus) return '';
    
    switch (validationStatus) {
      case 'true':
        return '✅';
      case 'false':
        return '❌';
      default:
        return '❓';
    }
  };

  // Create accessible label for the message
  const getMessageLabel = (): string => {
    const senderText = message.sender === 'user' ? 'You' : 'Assistant';
    const positionText = messageIndex && totalMessages 
      ? ` (message ${messageIndex} of ${totalMessages})` 
      : '';
    const validationText = message.validationStatus 
      ? ` (validation: ${message.validationStatus === 'true' ? 'valid' : message.validationStatus === 'false' ? 'invalid' : 'unknown'})`
      : '';
    return `${senderText} said${positionText}: ${message.content}${validationText}`;
  };

  return (
    <div 
      className={`message-wrapper ${message.sender}`}
      role="article"
      aria-label={getMessageLabel()}
      tabIndex={0}
    >
      <div className={`message-bubble ${message.sender}`}>
        <div className="message-content">
          {message.content}
          {message.sender === 'assistant' && message.validationStatus && (
            <span 
              className="validation-indicator"
              aria-label={`Validation status: ${message.validationStatus === 'true' ? 'valid' : message.validationStatus === 'false' ? 'invalid' : 'unknown'}`}
            >
              {getValidationIndicator(message.validationStatus)}
            </span>
          )}
        </div>
        {message.status === 'error' && message.sender === 'user' && onRetry && (
          <div className="message-meta">
            <button
              className="retry-button"
              onClick={handleRetry}
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

export default Message;