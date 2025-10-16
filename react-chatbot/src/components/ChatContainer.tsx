import { useState, useCallback, useRef, useEffect } from 'react';
import type { Message, ChatState } from '../types/chat';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import StreamingMessage from './StreamingMessage';
import { ChatServiceError } from '../services/ChatService';
import '../styles/ChatContainer.css';

/**
 * ChatContainer component that manages overall chat functionality
 * Handles message state management, typing indicators, and error states
 */
const ChatContainer: React.FC = () => {
  // Initialize chat state using useState hook
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isTyping: false, // Keep for MessageList compatibility
    error: undefined,
    isStreaming: false,
    streamingMessage: undefined
  });

  // Corrupt responses toggle state
  const [corruptResponses, setCorruptResponses] = useState<boolean>(false);

  // Refs for accessibility
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Generate unique message ID using crypto.randomUUID()
  const generateMessageId = useCallback((): string => {
    return crypto.randomUUID();
  }, []);

  // Create timestamp for new messages
  const createTimestamp = useCallback((): Date => {
    return new Date();
  }, []);

  // Function for adding messages to the chat state
  const addMessage = useCallback((messageData: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...messageData,
      id: generateMessageId(),
      timestamp: createTimestamp()
    };

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage],
      // Only clear errors when adding successful messages, not error messages
      error: messageData.status === 'error' ? prev.error : undefined
    }));

    // Announce new messages to screen readers
    if (liveRegionRef.current) {
      const announcement = messageData.sender === 'user' 
        ? `You said: ${messageData.content}`
        : `Assistant replied: ${messageData.content}`;
      liveRegionRef.current.textContent = announcement;
    }
  }, [generateMessageId, createTimestamp]);



  // Function for error management
  const setError = useCallback((error: string | undefined) => {
    setChatState(prev => ({
      ...prev,
      error
    }));
  }, []);

  // Clear all messages (utility function for future use)
  const clearMessages = useCallback(() => {
    setChatState(prev => ({
      ...prev,
      messages: [],
      error: undefined
    }));
  }, []);
  
  // Suppress unused variable warning - keeping for future use
  void clearMessages;



  // Get user-friendly error messages for different failure scenarios
  const getErrorMessage = useCallback((error: ChatServiceError): string => {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Network connection failed. Please check your internet connection and try again.';
      case 'TIMEOUT_ERROR':
        return 'Request timed out. The server is taking too long to respond.';
      case 'MAX_RETRIES_EXCEEDED':
        return 'Unable to connect after multiple attempts. Please try again later.';
      case 'EMPTY_MESSAGE':
        return 'Message cannot be empty. Please enter some text.';
      case 'MESSAGE_TOO_LONG':
        return 'Message is too long. Please keep it under 1000 characters.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }, []);

  // Handle sending a user message with streaming response
  const handleSendMessageStream = useCallback(async (content: string, doCorrupt: boolean = false) => {
    if (!content.trim()) {
      setError('Message cannot be empty');
      return;
    }

    let userMessageId: string;

    try {
      // Clear any existing errors
      setError(undefined);

      // Add user message with sending status
      const userMessage = {
        content: content.trim(),
        sender: 'user' as const,
        status: 'sending' as const
      };
      
      const newMessage = {
        ...userMessage,
        id: generateMessageId(),
        timestamp: createTimestamp()
      };
      
      userMessageId = newMessage.id;
      
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, newMessage],
        error: undefined,
        isStreaming: true,
        streamingMessage: content.trim(),
        doCorrupt: doCorrupt
      }));

      // Update user message status to sent
      setChatState(prev => ({
        ...prev,
        messages: prev.messages.map(msg => 
          msg.id === userMessageId 
            ? { ...msg, status: 'sent' }
            : msg
        )
      }));

      // The StreamingMessage component will handle the actual streaming
      // We just need to set up the state

    } catch (error) {
      // Handle errors
      if (userMessageId!) {
        setChatState(prev => ({
          ...prev,
          messages: prev.messages.map(msg => 
            msg.id === userMessageId 
              ? { ...msg, status: 'error' }
              : msg
          ),
          isStreaming: false,
          streamingMessage: undefined,
          doCorrupt: undefined
        }));
      }

      if (error instanceof ChatServiceError) {
        const errorMessage = getErrorMessage(error);
        setError(errorMessage);
      } else {
        setError('An unexpected error occurred. Please try again.');
        console.error('Unexpected error in handleSendMessageStream:', error);
      }
    }
  }, [generateMessageId, createTimestamp, setError, getErrorMessage]);

  // Handle completion of streaming response
  const handleStreamingComplete = useCallback((
    finalMessage: string, 
    validationStatus?: string, 
    initialResponse?: string, 
    corruptedResponse?: string,
    extractedLogicalStmt?: string,
    originalResult?: string,
    negatedResult?: string,
    durations?: Record<string, number>
  ) => {
    console.log('Debug - ChatContainer received extractedLogicalStmt:', extractedLogicalStmt);
    
    // Add the final assistant message with validation status stored separately
    addMessage({
      content: finalMessage,
      sender: 'assistant',
      status: 'sent',
      validationStatus,
      initialResponse,
      corruptedResponse,
      extractedLogicalStmt,
      originalResult,
      negatedResult,
      durations
    });

    // Clear streaming state
    setChatState(prev => ({
      ...prev,
      isStreaming: false,
      streamingMessage: undefined,
      doCorrupt: undefined
    }));
  }, [addMessage]);

  // Helper function to get validation indicator
  const getValidationIndicator = useCallback((validationStatus: string): string => {
    switch (validationStatus) {
      case 'true':
        return '✅';
      case 'false':
        return '❌';
      default:
        return '❓';
    }
  }, []);

  // Handle streaming errors
  const handleStreamingError = useCallback((error: Error) => {
    console.error('Streaming error:', error);
    
    // Add error message
    addMessage({
      content: 'Sorry, I encountered an error while processing your request. Please try again.',
      sender: 'assistant',
      status: 'error'
    });

    // Clear streaming state
    setChatState(prev => ({
      ...prev,
      isStreaming: false,
      streamingMessage: undefined,
      doCorrupt: undefined
    }));

    // Set error state
    if (error instanceof ChatServiceError) {
      setError(getErrorMessage(error));
    } else {
      setError('An unexpected error occurred during streaming.');
    }
  }, [addMessage, setError, getErrorMessage]);

  // Handle retry functionality for failed messages (using streaming)
  const handleRetryMessage = useCallback((messageId: string) => {
    const messageToRetry = chatState.messages.find(msg => msg.id === messageId);
    if (!messageToRetry || messageToRetry.sender !== 'user') {
      return;
    }

    // Clear any existing errors and retry with streaming
    setError(undefined);
    
    // Use the streaming method for retry
    handleSendMessageStream(messageToRetry.content);
  }, [chatState.messages, setError, handleSendMessageStream]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && chatState.error) {
      setError(undefined);
      return;
    }

    // Handle arrow key navigation for messages
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const messageElements = chatContainerRef.current?.querySelectorAll('.message-wrapper[tabindex="0"]');
      if (!messageElements || messageElements.length === 0) return;

      const currentFocus = document.activeElement;
      const currentIndex = Array.from(messageElements).indexOf(currentFocus as Element);
      
      let nextIndex = -1;
      if (event.key === 'ArrowUp') {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : messageElements.length - 1;
      } else {
        nextIndex = currentIndex < messageElements.length - 1 ? currentIndex + 1 : 0;
      }
      
      if (nextIndex >= 0 && nextIndex < messageElements.length) {
        event.preventDefault();
        (messageElements[nextIndex] as HTMLElement).focus();
      }
    }
  }, [chatState.error, setError]);

  // Effect to manage focus when errors appear
  useEffect(() => {
    if (chatState.error && chatContainerRef.current) {
      const errorElement = chatContainerRef.current.querySelector('.error-banner');
      if (errorElement) {
        (errorElement as HTMLElement).focus();
      }
    }
  }, [chatState.error]);

  return (
    <div 
      className="chat-container"
      ref={chatContainerRef}
      onKeyDown={handleKeyDown}
      aria-label="Chat conversation"
    >
      {/* Live region for screen reader announcements */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      
      <div className="chat-content">
        <div className="messages-section">
          <MessageList 
            messages={chatState.messages} 
            isTyping={false}
            onRetry={handleRetryMessage}
          />
          
          {/* Show streaming message if active */}
          {chatState.isStreaming && chatState.streamingMessage && (
            <StreamingMessage
              message={chatState.streamingMessage}
              doCorrupt={chatState.doCorrupt}
              onComplete={handleStreamingComplete}
              onError={handleStreamingError}
            />
          )}
          
          {chatState.error && (
            <div 
              className="error-banner"
              role="alert"
              aria-live="assertive"
              tabIndex={-1}
            >
              <div className="error-content">
                <span className="error-icon" aria-hidden="true">⚠️</span>
                <div className="error-details">
                  <span className="error-title">Connection Error</span>
                  <span className="error-text">{chatState.error}</span>
                </div>
              </div>
              <div className="error-actions">
                <button 
                  className="error-retry"
                  onClick={() => {
                    setError(undefined);
                    // Find the last failed user message and retry it
                    const lastFailedMessage = [...chatState.messages]
                      .reverse()
                      .find(msg => msg.sender === 'user' && msg.status === 'error');
                    if (lastFailedMessage) {
                      handleRetryMessage(lastFailedMessage.id);
                    }
                  }}
                  aria-label="Retry last failed message"
                  title="Retry sending the last failed message"
                >
                  <span className="retry-icon" aria-hidden="true">↻</span>
                  Retry
                </button>
                <button 
                  className="error-dismiss"
                  onClick={() => setError(undefined)}
                  aria-label="Dismiss error message"
                  title="Press Escape or click to dismiss"
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="input-section">
          <MessageInput 
            onSendMessage={handleSendMessageStream}
            disabled={chatState.isStreaming}
            corruptResponses={corruptResponses}
            onCorruptResponsesChange={setCorruptResponses}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatContainer;