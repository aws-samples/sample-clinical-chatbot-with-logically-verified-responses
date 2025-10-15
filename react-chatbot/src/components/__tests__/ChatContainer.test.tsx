import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChatContainer from '../ChatContainer';
import * as ChatServiceModule from '../../services/ChatService';

// Mock the ChatService
vi.mock('../../services/ChatService', () => ({
  chatService: {
    sendMessage: vi.fn(),
  },
  ChatServiceError: class extends Error {
    public code: string;
    public isRetryable: boolean;
    
    constructor(message: string, code: string, isRetryable: boolean = false) {
      super(message);
      this.name = 'ChatServiceError';
      this.code = code;
      this.isRetryable = isRetryable;
    }
  }
}));

describe('ChatContainer Integration', () => {
  const mockChatService = ChatServiceModule.chatService as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should integrate all components and handle complete message flow', async () => {
    // Mock successful response
    mockChatService.sendMessage.mockResolvedValue('Hello! How can I help you?');

    const { container } = render(<ChatContainer />);

    // Verify initial state
    expect(screen.getByText('Start a conversation by sending a message below.')).toBeInTheDocument();
    
    // Find input and send button
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: /send message/i });

    // Type a message
    fireEvent.change(input, { target: { value: 'Hello there!' } });
    
    // Send the message
    fireEvent.click(sendButton);

    // Verify user message appears
    await waitFor(() => {
      expect(screen.getByText('Hello there!')).toBeInTheDocument();
    });

    // Wait for assistant response
    await waitFor(() => {
      expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument();
    });

    // Verify typing indicator is not visible after response
    const typingIndicator = container.querySelector('.typing-indicator-wrapper');
    expect(typingIndicator).not.toBeInTheDocument();

    // Verify ChatService was called
    expect(mockChatService.sendMessage).toHaveBeenCalledWith('Hello there!');
  });

  it('should handle errors and display error messages', async () => {
    // Mock error response
    const error = new ChatServiceModule.ChatServiceError('Network error', 'NETWORK_ERROR', true);
    mockChatService.sendMessage.mockRejectedValue(error);

    render(<ChatContainer />);

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: /send message/i });

    // Send a message
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    // Wait for user message to appear
    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    // Wait for error message to appear in chat (retryable errors add an error message)
    await waitFor(() => {
      expect(screen.getByText('Sorry, I encountered an error. Please try again.')).toBeInTheDocument();
    });

    // Verify the error message has error status
    const errorMessage = screen.getByText('Sorry, I encountered an error. Please try again.').closest('.message-wrapper');
    expect(errorMessage).toHaveClass('assistant');
    
    // Verify ChatService was called
    expect(mockChatService.sendMessage).toHaveBeenCalledWith('Test message');
  });

  it('should disable input during message sending', async () => {
    // Mock delayed response
    mockChatService.sendMessage.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve('Response'), 100))
    );

    const { container } = render(<ChatContainer />);

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: /send message/i });

    // Send a message
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    // Verify input is disabled during sending and typing indicator appears
    await waitFor(() => {
      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();
      const typingIndicator = container.querySelector('.typing-indicator-wrapper');
      expect(typingIndicator).toBeInTheDocument();
    });

    // Wait for response and verify input is re-enabled
    await waitFor(() => {
      expect(screen.getByText('Response')).toBeInTheDocument();
    });

    // Wait a bit more to ensure state has updated
    await waitFor(() => {
      expect(input).not.toBeDisabled();
    });
  });

  it('should prevent sending empty messages', async () => {
    render(<ChatContainer />);

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: /send message/i });

    // Try to send empty message
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(sendButton);

    // Verify error appears
    await waitFor(() => {
      expect(screen.getByText(/Message cannot be empty/)).toBeInTheDocument();
    });

    // Verify ChatService was not called
    expect(mockChatService.sendMessage).not.toHaveBeenCalled();
  });
});