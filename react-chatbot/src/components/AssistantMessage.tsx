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
  
  // Debug: Track state changes
  React.useEffect(() => {
    console.log('🔄 showProcessInfo state changed to:', showProcessInfo, 'for message:', message.id);
  }, [showProcessInfo, message.id]);

  console.log('🤖 AssistantMessage render - messageId:', message.id, 'showProcessInfo:', showProcessInfo);
  console.log('🤖 Message data:', {
    content: message.content?.substring(0, 50) + '...',
    validationStatus: message.validationStatus,
    initialResponse: message.initialResponse?.substring(0, 30) + '...',
    corruptedResponse: message.corruptedResponse?.substring(0, 30) + '...',
    extractedLogicalStmt: message.extractedLogicalStmt,
    hasCorruptedResponse: !!message.corruptedResponse
  });

  // Ensure this component only renders assistant messages
  if (message.sender !== 'assistant') {
    console.warn('AssistantMessage component should only be used for assistant messages');
    return <Message message={message} messageIndex={messageIndex} totalMessages={totalMessages} onRetry={onRetry} />;
  }

  // Toggle between message content and process information
  const handleBubbleClick = () => {
    console.log('🖱️ Bubble clicked! Current showProcessInfo:', showProcessInfo, 'Will toggle to:', !showProcessInfo);
    console.log('🖱️ Message has corruptedResponse:', !!message.corruptedResponse);
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
    console.log('📊 getProcessInfo called');
    console.log('📊 Available data:', {
      corruptedResponse: !!message.corruptedResponse,
      initialResponse: !!message.initialResponse,
      extractedLogicalStmt: !!message.extractedLogicalStmt,
      validationStatus: message.validationStatus,
      durations: !!message.durations
    });
    
    // Show process info if we have any validation-related data
    const hasProcessData = message.corruptedResponse || 
                          message.initialResponse || 
                          message.extractedLogicalStmt || 
                          message.validationStatus || 
                          message.durations;
    
    if (!hasProcessData) {
      console.log('📊 No process data available, returning null');
      return null;
    }

    console.log('📊 Building process info table...');
    const rows = [];

    // Only show initial response if it exists and is different from main content
    if (message.initialResponse && message.initialResponse !== message.content) {
      rows.push(['Initial response', message.initialResponse]);
    }
    
    // Only show corrupted response if it exists and is different from other responses
    if (message.corruptedResponse && 
        message.corruptedResponse !== message.content && 
        message.corruptedResponse !== message.initialResponse) {
      rows.push(['Corrupted response', message.corruptedResponse]);
    }

    // Debug: Log the extracted logical statement
    console.log('Debug - extractedLogicalStmt:', message.extractedLogicalStmt);

    // Extracted logical statement
    if (message.extractedLogicalStmt) {
      rows.push(['Extracted logical statement', message.extractedLogicalStmt]);
    }

    // Results in order: Original result, Negated result, then Valid
    if (message.originalResult) {
      rows.push(['Original result', message.originalResult]);
    }

    if (message.negatedResult) {
      rows.push(['Negated result', message.negatedResult]);
    }

    if (message.validationStatus) {
      rows.push(['Valid', message.validationStatus]);
    }

    // Durations summary
    if (message.durations) {
      const durationText = Object.entries(message.durations)
        .map(([step, duration]) => `${step}: ${duration.toFixed(2)}s`)
        .join(', ');
      rows.push(['Durations', durationText]);
    }
    
    console.log('📊 Generated', rows.length, 'rows:', rows.map(r => r[0]));

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
              console.log('🎭 Rendering process info view');
              const processRows = getProcessInfo();
              console.log('🎭 Process rows:', processRows);
              
              if (!processRows) {
                console.log('🎭 No process rows, returning null');
                return null;
              }

              console.log('🎭 Rendering table with', processRows.length, 'rows');
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
            (() => {
              console.log('🎭 Rendering normal message view');
              return (
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
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
};

export default AssistantMessage;