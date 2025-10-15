import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { KeyboardEvent, FormEvent } from 'react';
import type { MessageInputProps } from '../types/components';

/**
 * MessageInput component for sending messages in the chat
 * Provides input field with validation and send functionality
 */
const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, disabled = false }) => {
  // Controlled input state
  const [inputValue, setInputValue] = useState<string>('');
  
  // Ref for the input field
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Configuration constants
  const MAX_MESSAGE_LENGTH = 1000;
  const MIN_MESSAGE_LENGTH = 1;

  // Auto-focus the input when component mounts
  useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [disabled]);

  // Input validation function
  const validateMessage = useCallback((message: string): { isValid: boolean; error?: string } => {
    const trimmedMessage = message.trim();
    
    if (trimmedMessage.length < MIN_MESSAGE_LENGTH) {
      return { isValid: false, error: 'Message cannot be empty' };
    }
    
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return { isValid: false, error: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters` };
    }
    
    return { isValid: true };
  }, []);

  // Handle input change with character validation
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    
    // Allow input up to max length + some buffer for user experience
    if (newValue.length <= MAX_MESSAGE_LENGTH + 50) {
      setInputValue(newValue);
    }
  }, []);

  // Handle message submission
  const handleSubmit = useCallback(() => {
    const validation = validateMessage(inputValue);
    
    if (!validation.isValid) {
      // Could show error message in future enhancement
      return;
    }
    
    const trimmedMessage = inputValue.trim();
    onSendMessage(trimmedMessage);
    setInputValue(''); // Clear input after sending
  }, [inputValue, validateMessage, onSendMessage]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); // Prevent form submission or newline
      handleSubmit();
    } else if (event.key === 'Escape') {
      // Clear input on Escape
      setInputValue('');
    }
  }, [handleSubmit]);

  // Handle form submission (for accessibility)
  const handleFormSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSubmit();
  }, [handleSubmit]);

  // Check if send should be disabled
  const validation = validateMessage(inputValue);
  const isSendDisabled = disabled || !validation.isValid;

  return (
    <form className="message-input-form" onSubmit={handleFormSubmit}>
      <div className="message-input-container">
        <input
          ref={inputRef}
          type="text"
          className="message-input-field"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={disabled}
          maxLength={MAX_MESSAGE_LENGTH + 50} // Allow some buffer for better UX
          aria-label="Type your message here"
          aria-describedby="message-input-instructions"
        />
        
        <button
          type="submit"
          className="message-send-button"
          disabled={isSendDisabled}
          aria-label="Send message"
        >
          Send
        </button>
      </div>
      
      {/* Instructions for screen readers */}
      <div id="message-input-instructions" className="sr-only">
        Press Enter to send message, Escape to clear input
      </div>
      
      {/* Validation error display */}
      {!validation.isValid && inputValue.length > 0 && (
        <div className="message-input-info">
          <span className="validation-error" role="alert" aria-live="assertive">
            {validation.error}
          </span>
        </div>
      )}
    </form>
  );
};

export default MessageInput;