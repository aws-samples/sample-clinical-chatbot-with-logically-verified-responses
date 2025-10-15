import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { MessageListProps } from '../types/components';
import UserMessage from './UserMessage';
import AssistantMessage from './AssistantMessage';
import TypingIndicator from './TypingIndicator';
import '../styles/MessageList.css';

/**
 * MessageList component that displays conversation history with scrolling functionality
 * Handles auto-scroll to latest messages and preserves user scroll position
 */
const MessageList: React.FC<MessageListProps> = ({ messages, isTyping, onRetry }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const scrollTimeoutRef = useRef<number | undefined>(undefined);

  // Check if user is near the bottom of the scroll container
  const isNearBottom = useCallback((): boolean => {
    const container = scrollContainerRef.current;
    if (!container) return true;

    const threshold = 100; // pixels from bottom
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, []);

  // Smooth scroll to bottom function
  const scrollToBottom = useCallback((smooth: boolean = true) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }, []);

  // Handle scroll events to detect user scrolling
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }

    // Set user scrolling state
    setIsUserScrolling(true);

    // Check if user scrolled near bottom
    const nearBottom = isNearBottom();
    setShouldAutoScroll(nearBottom);

    // Reset user scrolling state after scroll ends
    scrollTimeoutRef.current = window.setTimeout(() => {
      setIsUserScrolling(false);
    }, 150);
  }, [isNearBottom]);

  // Auto-scroll effect when new messages arrive or typing state changes
  useEffect(() => {
    if (shouldAutoScroll && !isUserScrolling) {
      // Small delay to ensure DOM has updated
      const timeoutId = setTimeout(() => {
        scrollToBottom(true);
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, isTyping, shouldAutoScroll, isUserScrolling, scrollToBottom]);

  // Initial scroll to bottom when component mounts
  useEffect(() => {
    scrollToBottom(false);
  }, [scrollToBottom]);

  // Handle keyboard navigation within message list
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    switch (event.key) {
      case 'Home':
        event.preventDefault();
        container.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'End':
        event.preventDefault();
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        break;
      case 'PageUp':
        event.preventDefault();
        container.scrollBy({ top: -container.clientHeight * 0.8, behavior: 'smooth' });
        break;
      case 'PageDown':
        event.preventDefault();
        container.scrollBy({ top: container.clientHeight * 0.8, behavior: 'smooth' });
        break;
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="message-list">
      <div 
        className="message-list-container"
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        aria-describedby="message-list-instructions"
        tabIndex={0}
      >
        <div className="messages-content">
          {messages.length === 0 ? (
            <div className="empty-state" role="status">
              <p>Start a conversation by sending a message below.</p>
            </div>
          ) : (
            messages.map((message, index) => (
              message.sender === 'user' ? (
                <UserMessage 
                  key={message.id} 
                  message={message}
                  messageIndex={index + 1}
                  totalMessages={messages.length}
                  onRetry={onRetry}
                />
              ) : (
                <AssistantMessage 
                  key={message.id} 
                  message={message}
                  messageIndex={index + 1}
                  totalMessages={messages.length}
                  onRetry={onRetry}
                />
              )
            ))
          )}
          
          <TypingIndicator isVisible={isTyping} />
        </div>
      </div>
      
      {/* Instructions for screen readers */}
      <div id="message-list-instructions" className="sr-only">
        Chat message history. Use Home/End to go to top/bottom, Page Up/Down to scroll, Tab to navigate between messages.
      </div>
    </div>
  );
};

export default MessageList;