import React, { useState } from 'react';
import Message from './Message';
import type { MessageProps } from '../types/components';
import '../styles/Message.css';

/**
 * AssistantMessage component for displaying assistant messages
 * Extends base Message component with left-aligned styling and gray background
 */
const AssistantMessage: React.FC<MessageProps> = ({ message, messageIndex, totalMessages, onRetry }) => {
  const [showProcessInfo, setShowProcessInfo] = useState(false);

  // Ensure this component only renders assistant messages
  if (message.sender !== 'assistant') {
    console.warn('AssistantMessage component should only be used for assistant messages');
    return <Message message={message} messageIndex={messageIndex} totalMessages={totalMessages} onRetry={onRetry} />;
  }

  // Toggle between message content and process information
  const handleBubbleClick = () => {
    setShowProcessInfo(!showProcessInfo);
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

  // Create accessible label for assistant message
  const getMessageLabel = (): string => {
    const positionText = messageIndex && totalMessages
      ? ` (message ${messageIndex} of ${totalMessages})`
      : '';
    const validationText = message.validationStatus
      ? ` (validation: ${message.validationStatus === 'true' ? 'valid' : message.validationStatus === 'false' ? 'invalid' : 'unknown'})`
      : '';
    return `Assistant said${positionText}: ${message.content}${validationText}`;
  };

  // Generate process information content as table data
  const getProcessInfo = () => {
    // Don't show anything if corrupted_response is None/undefined
    if (!message.corruptedResponse) {
      return null;
    }

    const rows = [];

    // Initial and corrupted responses
    rows.push(['Initial response', message.initialResponse || 'Not available']);
    rows.push(['Corrupted response', message.corruptedResponse]);

    // Debug: Log the extracted logical statement
    console.log('Debug - extractedLogicalStmt:', message.extractedLogicalStmt);

    // Extracted logical statement
    if (message.extractedLogicalStmt) {
      rows.push(['Extracted logical statement', message.extractedLogicalStmt]);
    } else {
      rows.push(['Extracted logical statement', 'Not available']);
    }

    // Results in order: Original result, Negated result, then Valid
    const originalResult = message.originalResult || 'N/A';
    rows.push(['Original result', originalResult]);

    const negatedResult = message.negatedResult || 'N/A';
    rows.push(['Negated result', negatedResult]);

    const validText = message.validationStatus || 'Unknown';
    rows.push(['Valid', validText]);

    // Durations summary
    if (message.durations) {
      const durationText = Object.entries(message.durations)
        .map(([step, duration]) => `${step}: ${duration.toFixed(2)}s`)
        .join(', ');
      rows.push(['Durations', durationText]);
    }

    return rows;
  };

  return (
    <div
      className="message-wrapper assistant assistant-message"
      role="article"
      aria-label={getMessageLabel()}
      tabIndex={0}
    >
      <div
        className="message-bubble assistant clickable"
        onClick={handleBubbleClick}
        style={{ cursor: 'pointer' }}
        title="Click to toggle process information"
      >
        <div className="message-content">
          {showProcessInfo ? (
            (() => {
              const processRows = getProcessInfo();
              if (!processRows) return null;

              return (
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  fontSize: '0.875rem',
                  lineHeight: 1.2,
                  margin: 0
                }}>
                  <tbody>
                    {processRows.map((row, index) => (
                      <tr key={index}>
                        <td style={{
                          padding: '2px 8px 2px 0',
                          verticalAlign: 'top',
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap'
                        }}>
                          {row[0]}:
                        </td>
                        <td style={{
                          padding: '2px 0',
                          verticalAlign: 'top',
                          wordBreak: 'break-word'
                        }}>
                          {row[1]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()
          ) : (
            <>
              {message.content}
              {message.validationStatus && (
                <span
                  className="validation-indicator"
                  aria-label={`Validation status: ${message.validationStatus === 'true' ? 'valid' : message.validationStatus === 'false' ? 'invalid' : 'unknown'}`}
                >
                  {getValidationIndicator(message.validationStatus)}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssistantMessage;