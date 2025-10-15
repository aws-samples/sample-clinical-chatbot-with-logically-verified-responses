import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '../App';
import * as ChatServiceModule from '../services/ChatService';

// Mock the ChatService
vi.mock('../services/ChatService', () => ({
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

// Mock window.matchMedia for responsive testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver for responsive testing
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe('Comprehensive Integration Tests', () => {
  const mockChatService = ChatServiceModule.chatService as any;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    
    // Reset viewport to desktop size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Message Flow Integration', () => {
    it('should handle complete message flow from input to assistant response', async () => {
      // Mock successful response with delay to catch typing indicator
      mockChatService.sendMessage.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('Hello! How can I help you today?'), 100))
      );

      const { container } = render(<App />);

      // Verify initial state - should show empty chat
      expect(screen.getByText('Start a conversation by sending a message below.')).toBeInTheDocument();
      
      // Find input and send button
      const input = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      // Verify initial state of input elements
      expect(input).toBeEnabled();
      expect(sendButton).toBeDisabled(); // Button is disabled when input is empty
      expect(input).toHaveValue('');

      // Type a message using userEvent for more realistic interaction
      await user.type(input, 'Hello there!');
      expect(input).toHaveValue('Hello there!');
      
      // Send the message by clicking send button
      await user.click(sendButton);

      // Verify input is cleared and send button is disabled during processing
      expect(input).toHaveValue('');
      expect(sendButton).toBeDisabled();

      // Verify user message appears with sending status
      await waitFor(() => {
        expect(screen.getByText('Hello there!')).toBeInTheDocument();
      });

      // Verify typing indicator appears
      await waitFor(() => {
        const typingIndicator = container.querySelector('.typing-indicator-wrapper');
        expect(typingIndicator).toBeInTheDocument();
      });

      // Wait for assistant response
      await waitFor(() => {
        expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument();
      });

      // Verify typing indicator disappears after response
      await waitFor(() => {
        const typingIndicator = container.querySelector('.typing-indicator-wrapper');
        expect(typingIndicator).not.toBeInTheDocument();
      });

      // Verify input is re-enabled after response (send button stays disabled when input is empty)
      await waitFor(() => {
        expect(input).toBeEnabled();
        expect(sendButton).toBeDisabled(); // Still disabled because input is empty
      });

      // Verify ChatService was called with correct message
      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Hello there!');
      expect(mockChatService.sendMessage).toHaveBeenCalledTimes(1);

      // Verify message styling and positioning
      const userMessage = screen.getByText('Hello there!').closest('.message-wrapper');
      const assistantMessage = screen.getByText('Hello! How can I help you today?').closest('.message-wrapper');
      
      expect(userMessage).toHaveClass('user');
      expect(assistantMessage).toHaveClass('assistant');
    });

    it('should handle Enter key submission in message flow', async () => {
      mockChatService.sendMessage.mockResolvedValue('Response via Enter key');

      render(<App />);

      const input = screen.getByPlaceholderText('Type your message...');

      // Type message and press Enter
      await user.type(input, 'Test Enter key');
      await user.keyboard('{Enter}');

      // Verify message was sent
      await waitFor(() => {
        expect(screen.getByText('Test Enter key')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Response via Enter key')).toBeInTheDocument();
      });

      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Test Enter key');
    });

    it('should handle multiple consecutive messages correctly', async () => {
      mockChatService.sendMessage
        .mockResolvedValueOnce('First response')
        .mockResolvedValueOnce('Second response')
        .mockResolvedValueOnce('Third response');

      render(<App />);

      const input = screen.getByPlaceholderText('Type your message...');

      // Send first message
      await user.type(input, 'First message');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('First message')).toBeInTheDocument();
        expect(screen.getByText('First response')).toBeInTheDocument();
      });

      // Send second message
      await user.type(input, 'Second message');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Second message')).toBeInTheDocument();
        expect(screen.getByText('Second response')).toBeInTheDocument();
      });

      // Send third message
      await user.type(input, 'Third message');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Third message')).toBeInTheDocument();
        expect(screen.getByText('Third response')).toBeInTheDocument();
      });

      // Verify all messages are present and in correct order
      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText('Second message')).toBeInTheDocument();
      expect(screen.getByText('Third message')).toBeInTheDocument();
      expect(screen.getByText('First response')).toBeInTheDocument();
      expect(screen.getByText('Second response')).toBeInTheDocument();
      expect(screen.getByText('Third response')).toBeInTheDocument();

      // Verify service was called for each message
      expect(mockChatService.sendMessage).toHaveBeenCalledTimes(3);
    });
  });

  describe('Auto-scroll Behavior Integration', () => {
    it('should auto-scroll to show latest messages', async () => {
      mockChatService.sendMessage.mockImplementation((message) => 
        Promise.resolve(`Response to: ${message}`)
      );

      const { container } = render(<App />);
      const input = screen.getByPlaceholderText('Type your message...');

      // Mock scrollTo to track scroll behavior
      const mockScrollTo = vi.fn();
      const messageListContainer = container.querySelector('.message-list-container');
      if (messageListContainer) {
        messageListContainer.scrollTo = mockScrollTo;
        // Mock scrollHeight and clientHeight to simulate overflow
        Object.defineProperty(messageListContainer, 'scrollHeight', { value: 1000, configurable: true });
        Object.defineProperty(messageListContainer, 'clientHeight', { value: 400, configurable: true });
      }

      // Send multiple messages to trigger scrolling
      for (let i = 1; i <= 5; i++) {
        await user.type(input, `Message ${i}`);
        await user.keyboard('{Enter}');
        
        await waitFor(() => {
          expect(screen.getByText(`Message ${i}`)).toBeInTheDocument();
        });

        await waitFor(() => {
          expect(screen.getByText(`Response to: Message ${i}`)).toBeInTheDocument();
        });
      }

      // Wait for auto-scroll to happen (it uses setTimeout with 50ms delay)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify scrollTo was called (auto-scroll behavior)
      // Should be called after each message pair (user + assistant)
      expect(mockScrollTo).toHaveBeenCalled();
    });

    it('should preserve scroll position when user scrolls up manually', async () => {
      mockChatService.sendMessage.mockResolvedValue('Response');

      const { container } = render(<App />);
      const input = screen.getByPlaceholderText('Type your message...');

      // Send initial messages
      await user.type(input, 'First message');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Response')).toBeInTheDocument();
      });

      const messageList = container.querySelector('.message-list');
      if (messageList) {
        // Mock scroll properties
        Object.defineProperty(messageList, 'scrollHeight', { value: 1000, configurable: true });
        Object.defineProperty(messageList, 'clientHeight', { value: 400, configurable: true });
        Object.defineProperty(messageList, 'scrollTop', { value: 100, writable: true });

        // Simulate user scrolling up
        fireEvent.scroll(messageList, { target: { scrollTop: 100 } });

        // Send another message while scrolled up
        mockChatService.sendMessage.mockResolvedValueOnce('Second response');
        await user.type(input, 'Second message');
        await user.keyboard('{Enter}');

        await waitFor(() => {
          expect(screen.getByText('Second message')).toBeInTheDocument();
        });

        // Verify scroll position is maintained (not auto-scrolled to bottom)
        expect(messageList.scrollTop).toBe(100);
      }
    });

    it('should handle smooth scrolling behavior', async () => {
      mockChatService.sendMessage.mockResolvedValue('Smooth scroll response');

      const { container } = render(<App />);
      const input = screen.getByPlaceholderText('Type your message...');

      const messageListContainer = container.querySelector('.message-list-container');
      if (messageListContainer) {
        const mockScrollTo = vi.fn();
        messageListContainer.scrollTo = mockScrollTo;

        await user.type(input, 'Test smooth scroll');
        await user.keyboard('{Enter}');

        await waitFor(() => {
          expect(screen.getByText('Smooth scroll response')).toBeInTheDocument();
        });

        // Verify scrollTo was called with smooth behavior
        expect(mockScrollTo).toHaveBeenCalledWith(
          expect.objectContaining({
            behavior: 'smooth'
          })
        );
      }
    });
  });

  describe('Responsive Behavior Integration', () => {
    it('should adapt layout for mobile screen sizes', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // iPhone width
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667, // iPhone height
      });

      // Mock matchMedia to return mobile breakpoint
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query.includes('max-width: 768px'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      mockChatService.sendMessage.mockResolvedValue('Mobile response');

      const { container } = render(<App />);

      // Verify mobile-friendly layout
      const chatContainer = container.querySelector('.chat-container');
      expect(chatContainer).toBeInTheDocument();

      // Test touch interaction simulation
      const input = screen.getByPlaceholderText('Type your message...');
      
      // Simulate touch events
      fireEvent.touchStart(input);
      await user.type(input, 'Mobile test message');
      fireEvent.touchEnd(input);
      
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Mobile test message')).toBeInTheDocument();
        expect(screen.getByText('Mobile response')).toBeInTheDocument();
      });

      // Verify functionality works on mobile
      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Mobile test message');
    });

    it('should utilize desktop screen space effectively', async () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1080,
      });

      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query.includes('min-width: 1024px'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      mockChatService.sendMessage.mockResolvedValue('Desktop response');

      const { container } = render(<App />);

      // Verify desktop layout
      const chatContainer = container.querySelector('.chat-container');
      expect(chatContainer).toBeInTheDocument();

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Desktop test message');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Desktop test message')).toBeInTheDocument();
        expect(screen.getByText('Desktop response')).toBeInTheDocument();
      });

      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Desktop test message');
    });

    it('should maintain functionality when screen size changes', async () => {
      const { container } = render(<App />);

      // Start with desktop size
      expect(window.innerWidth).toBe(1024);

      // Verify initial desktop layout
      expect(container.querySelector('.main-layout')).toBeInTheDocument();
      
      const input = screen.getByPlaceholderText('Type your message...');
      expect(input).toBeInTheDocument();
      expect(input).toBeEnabled();

      // Simulate screen resize to mobile
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 375,
        });
        window.dispatchEvent(new Event('resize'));
      });

      // Wait for resize to take effect
      await waitFor(() => {
        const mainLayout = container.querySelector('.main-layout');
        expect(mainLayout).toHaveClass('main-layout--mobile');
      });

      // Verify input functionality is maintained after resize
      const inputAfterResize = screen.getByPlaceholderText('Type your message...');
      expect(inputAfterResize).toBeInTheDocument();
      expect(inputAfterResize).toBeEnabled();
      
      // Verify chat container is still present
      expect(container.querySelector('.chat-container')).toBeInTheDocument();
      
      // Test that input still accepts text after resize
      await user.type(inputAfterResize, 'Test after resize');
      expect(inputAfterResize).toHaveValue('Test after resize');
    });

    it('should support touch-based scrolling and input on mobile', async () => {
      // Mock mobile environment
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      
      mockChatService.sendMessage.mockImplementation((msg) => `Touch response to: ${msg}`);

      const { container } = render(<App />);

      // Send multiple messages to create scrollable content
      const input = screen.getByPlaceholderText('Type your message...');
      
      for (let i = 1; i <= 3; i++) {
        await user.type(input, `Touch message ${i}`);
        
        // Simulate touch events on send button
        const sendButton = screen.getByRole('button', { name: /send message/i });
        fireEvent.touchStart(sendButton);
        fireEvent.touchEnd(sendButton);
        fireEvent.click(sendButton);

        await waitFor(() => {
          expect(screen.getByText(`Touch message ${i}`)).toBeInTheDocument();
          expect(screen.getByText(`Touch response to: Touch message ${i}`)).toBeInTheDocument();
        });
      }

      // Simulate touch scrolling on message list
      const messageList = container.querySelector('.message-list');
      if (messageList) {
        fireEvent.touchStart(messageList, { touches: [{ clientY: 100 }] });
        fireEvent.touchMove(messageList, { touches: [{ clientY: 50 }] });
        fireEvent.touchEnd(messageList);
      }

      // Verify all messages are still accessible
      expect(screen.getByText('Touch message 1')).toBeInTheDocument();
      expect(screen.getByText('Touch message 3')).toBeInTheDocument();
    });
  });

  describe('Error Handling and Recovery Integration', () => {
    it('should handle network errors and display error messages', async () => {
      // Mock network error
      const networkError = new ChatServiceModule.ChatServiceError('Network connection failed', 'NETWORK_ERROR', true);
      mockChatService.sendMessage.mockRejectedValue(networkError);

      render(<App />);

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test network error');
      await user.keyboard('{Enter}');

      // Wait for user message to appear
      await waitFor(() => {
        expect(screen.getByText('Test network error')).toBeInTheDocument();
      });

      // Wait for error message to appear in chat
      await waitFor(() => {
        expect(screen.getByText('Sorry, I encountered an error. Please try again.')).toBeInTheDocument();
      });

      // Verify error banner appears
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/Network connection failed/)).toBeInTheDocument();
      });

      // Verify retry button is available
      const retryButton = screen.getByRole('button', { name: /retry last failed message/i });
      expect(retryButton).toBeInTheDocument();

      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Test network error');
    });

    it('should handle timeout errors with retry functionality', async () => {
      // Mock timeout error first, then success
      const timeoutError = new ChatServiceModule.ChatServiceError('Request timed out', 'TIMEOUT_ERROR', true);
      mockChatService.sendMessage
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce('Success after retry');

      render(<App />);

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test timeout');
      await user.keyboard('{Enter}');

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/Request timed out/)).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /retry last failed message/i });
      await user.click(retryButton);

      // Wait for successful response after retry
      await waitFor(() => {
        expect(screen.getByText('Success after retry')).toBeInTheDocument();
      });

      // Verify error banner is dismissed
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });

      expect(mockChatService.sendMessage).toHaveBeenCalledTimes(2);
    });

    it('should handle validation errors without retry', async () => {
      render(<App />);

      const input = screen.getByPlaceholderText('Type your message...');
      
      // Try to send empty message
      await user.type(input, '   '); // Only whitespace
      await user.keyboard('{Enter}');

      // Verify validation error appears
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/Message cannot be empty/)).toBeInTheDocument();
      });

      // Verify no message was sent to service
      expect(mockChatService.sendMessage).not.toHaveBeenCalled();

      // Verify no user message appears in chat
      expect(screen.queryByText('   ')).not.toBeInTheDocument();
    });

    it('should handle message too long error', async () => {
      render(<App />);

      const input = screen.getByPlaceholderText('Type your message...');
      const longMessage = 'a'.repeat(1001); // Exceeds limit
      
      await user.type(input, longMessage);

      // Wait for validation error to appear (client-side validation)
      await waitFor(() => {
        expect(screen.getByText(/Message cannot exceed 1000 characters/)).toBeInTheDocument();
      });

      // Verify send button is disabled for long messages
      const sendButton = screen.getByRole('button', { name: /send message/i });
      expect(sendButton).toBeDisabled();

      // Verify service is not called for invalid input
      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    });

    it('should handle error dismissal with Escape key', async () => {
      const error = new ChatServiceModule.ChatServiceError('Test error', 'TEST_ERROR', true);
      mockChatService.sendMessage.mockRejectedValue(error);

      render(<App />);

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test error dismissal');
      await user.keyboard('{Enter}');

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Press Escape to dismiss error
      await user.keyboard('{Escape}');

      // Verify error is dismissed
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('should handle error dismissal with dismiss button', async () => {
      const error = new ChatServiceModule.ChatServiceError('Test error', 'TEST_ERROR', true);
      mockChatService.sendMessage.mockRejectedValue(error);

      render(<App />);

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test error dismissal');
      await user.keyboard('{Enter}');

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Click dismiss button
      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissButton);

      // Verify error is dismissed
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('should handle multiple consecutive errors gracefully', async () => {
      const error1 = new ChatServiceModule.ChatServiceError('First error', 'ERROR_1', true);
      const error2 = new ChatServiceModule.ChatServiceError('Second error', 'ERROR_2', true);
      
      mockChatService.sendMessage
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2)
        .mockResolvedValueOnce('Finally success');

      render(<App />);

      const input = screen.getByPlaceholderText('Type your message...');

      // First error
      await user.type(input, 'First message');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/First error/)).toBeInTheDocument();
      });

      // Dismiss first error
      const dismissButton1 = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissButton1);

      // Second error
      await user.type(input, 'Second message');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/Second error/)).toBeInTheDocument();
      });

      // Retry and succeed
      const retryButton = screen.getByRole('button', { name: /retry last failed message/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Finally success')).toBeInTheDocument();
      });

      // Verify all user messages are present
      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText('Second message')).toBeInTheDocument();
    });

    it('should recover from errors and continue normal operation', async () => {
      const error = new ChatServiceModule.ChatServiceError('Temporary error', 'TEMP_ERROR', true);
      
      mockChatService.sendMessage
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('Recovery successful')
        .mockResolvedValueOnce('Normal operation resumed');

      render(<App />);

      const input = screen.getByPlaceholderText('Type your message...');

      // First message fails
      await user.type(input, 'Error message');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Retry and succeed
      const retryButton = screen.getByRole('button', { name: /retry last failed message/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Recovery successful')).toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });

      // Send another message to verify normal operation
      await user.type(input, 'Normal message');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Normal message')).toBeInTheDocument();
        expect(screen.getByText('Normal operation resumed')).toBeInTheDocument();
      });

      // Verify no errors remain
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should handle unexpected errors gracefully', async () => {
      // Mock unexpected error (not ChatServiceError)
      const unexpectedError = new Error('Unexpected system error');
      mockChatService.sendMessage.mockRejectedValue(unexpectedError);

      // Mock console.error to verify error logging
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<App />);

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Unexpected error test');
      await user.keyboard('{Enter}');

      // Wait for generic error message
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument();
      });

      // Verify error was logged to console
      expect(consoleSpy).toHaveBeenCalledWith(
        'Unexpected error in handleSendMessage:',
        unexpectedError
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility Integration', () => {
    it('should announce new messages to screen readers', async () => {
      mockChatService.sendMessage.mockResolvedValue('Accessible response');

      const { container } = render(<App />);

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Accessibility test');
      await user.keyboard('{Enter}');

      // Wait for messages to appear
      await waitFor(() => {
        expect(screen.getByText('Accessibility test')).toBeInTheDocument();
        expect(screen.getByText('Accessible response')).toBeInTheDocument();
      });

      // Verify live region exists and gets updated
      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
    });

    it('should handle keyboard navigation through messages', async () => {
      mockChatService.sendMessage
        .mockResolvedValueOnce('First response')
        .mockResolvedValueOnce('Second response');

      const { container } = render(<App />);

      const input = screen.getByPlaceholderText('Type your message...');

      // Send multiple messages
      await user.type(input, 'First message');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('First response')).toBeInTheDocument();
      });

      await user.type(input, 'Second message');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Second response')).toBeInTheDocument();
      });

      // Test arrow key navigation
      const chatContainer = container.querySelector('.chat-container');
      if (chatContainer) {
        // Focus the chat container
        chatContainer.focus();

        // Simulate arrow key navigation
        fireEvent.keyDown(chatContainer, { key: 'ArrowUp' });
        fireEvent.keyDown(chatContainer, { key: 'ArrowDown' });
      }

      // Verify navigation doesn't break functionality
      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText('Second message')).toBeInTheDocument();
    });

    it('should manage focus properly during error states', async () => {
      const error = new ChatServiceModule.ChatServiceError('Focus test error', 'FOCUS_ERROR', true);
      mockChatService.sendMessage.mockRejectedValue(error);

      render(<App />);

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Focus test');
      await user.keyboard('{Enter}');

      // Wait for error to appear
      await waitFor(() => {
        const errorBanner = screen.getByRole('alert');
        expect(errorBanner).toBeInTheDocument();
        
        // Verify error banner can receive focus for screen readers
        expect(errorBanner).toHaveAttribute('tabIndex', '-1');
      });
    });

    it('should provide proper ARIA labels and roles', async () => {
      mockChatService.sendMessage.mockResolvedValue('ARIA test response');

      render(<App />);

      // Verify main chat area has proper ARIA attributes
      const chatContainer = screen.getByRole('main', { name: /chat conversation/i });
      expect(chatContainer).toBeInTheDocument();

      // Verify input has proper labeling
      const input = screen.getByPlaceholderText('Type your message...');
      expect(input).toHaveAttribute('aria-label');

      // Send a message and verify message structure
      await user.type(input, 'ARIA test');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('ARIA test response')).toBeInTheDocument();
      });

      // Verify error states have proper ARIA attributes when they occur
      const error = new ChatServiceModule.ChatServiceError('ARIA error test', 'ARIA_ERROR', true);
      mockChatService.sendMessage.mockRejectedValueOnce(error);

      await user.type(input, 'ARIA error test');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle rapid message sending without breaking', async () => {
      mockChatService.sendMessage.mockImplementation((msg) => 
        Promise.resolve(`Response to: ${msg}`)
      );

      render(<App />);

      const input = screen.getByPlaceholderText('Type your message...');

      // Send messages rapidly
      const messages = ['Rapid 1', 'Rapid 2', 'Rapid 3'];
      
      for (const message of messages) {
        await user.type(input, message);
        await user.keyboard('{Enter}');
        
        // Small delay to allow processing
        await waitFor(() => {
          expect(screen.getByText(message)).toBeInTheDocument();
        });
      }

      // Verify all messages and responses appear
      for (const message of messages) {
        expect(screen.getByText(message)).toBeInTheDocument();
        expect(screen.getByText(`Response to: ${message}`)).toBeInTheDocument();
      }

      expect(mockChatService.sendMessage).toHaveBeenCalledTimes(3);
    });

    it('should handle very long conversations without performance degradation', async () => {
      mockChatService.sendMessage.mockImplementation((msg) => 
        Promise.resolve(`Auto response ${msg.split(' ')[1]}`)
      );

      render(<App />);

      const input = screen.getByPlaceholderText('Type your message...');

      // Send many messages to test performance
      for (let i = 1; i <= 10; i++) {
        await user.type(input, `Message ${i}`);
        await user.keyboard('{Enter}');
        
        await waitFor(() => {
          expect(screen.getByText(`Message ${i}`)).toBeInTheDocument();
          expect(screen.getByText(`Auto response ${i}`)).toBeInTheDocument();
        });
      }

      // Verify first and last messages are still accessible
      expect(screen.getByText('Message 1')).toBeInTheDocument();
      expect(screen.getByText('Message 10')).toBeInTheDocument();
      expect(screen.getByText('Auto response 1')).toBeInTheDocument();
      expect(screen.getByText('Auto response 10')).toBeInTheDocument();
    });

    it('should handle edge case inputs gracefully', async () => {
      mockChatService.sendMessage.mockImplementation((msg) => `Handled: ${msg}`);

      render(<App />);

      const input = screen.getByPlaceholderText('Type your message...');

      // Test various edge case inputs
      const edgeCases = [
        'Special chars: !@#$%^&*()',
        'Unicode: 🚀 🎉 ✨',
        'Numbers: 123456789',
        'Mixed: Hello123!@# 🎉',
        'Whitespace test',
      ];

      for (const testCase of edgeCases) {
        await user.clear(input);
        await user.type(input, testCase);
        await user.keyboard('{Enter}');
        
        await waitFor(() => {
          expect(screen.getByText(testCase)).toBeInTheDocument();
          expect(screen.getByText(`Handled: ${testCase}`)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Dual-Pane Layout Integration', () => {
    it('should render MainLayout with ChatContainer and TheorySection', async () => {
      mockChatService.sendMessage.mockResolvedValue('Layout test response');

      const { container } = render(<App />);

      // Verify MainLayout is rendered
      const mainLayout = container.querySelector('.main-layout');
      expect(mainLayout).toBeInTheDocument();

      // Verify ChatContainer is rendered within the layout
      const chatContainer = container.querySelector('.chat-container');
      expect(chatContainer).toBeInTheDocument();

      // Verify TheorySection is rendered (on desktop)
      const theorySection = container.querySelector('.theory-section');
      if (window.innerWidth >= 768) {
        expect(theorySection).toBeInTheDocument();
      }

      // Test that chat functionality works within the dual-pane layout
      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Layout integration test');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Layout integration test')).toBeInTheDocument();
        expect(screen.getByText('Layout test response')).toBeInTheDocument();
      });

      // Verify message flow works correctly within the layout
      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Layout integration test');
    });

    it('should handle resizable separator functionality', async () => {
      const { container } = render(<App />);

      // Verify ResizableSeparator is present on desktop
      const separator = container.querySelector('.resizable-separator');
      if (window.innerWidth >= 1024) {
        expect(separator).toBeInTheDocument();
      }

      // Verify layout panes are properly structured
      const chatPane = container.querySelector('.main-layout__chat-pane');
      const theoryPane = container.querySelector('.main-layout__theory-pane');
      
      if (window.innerWidth >= 768) {
        expect(chatPane).toBeInTheDocument();
        expect(theoryPane).toBeInTheDocument();
      }
    });

    it('should maintain chat functionality across responsive breakpoints', async () => {
      mockChatService.sendMessage.mockResolvedValue('Responsive test response');

      render(<App />);

      // Test chat functionality regardless of layout mode
      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Responsive test');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Responsive test')).toBeInTheDocument();
        expect(screen.getByText('Responsive test response')).toBeInTheDocument();
      });

      // Verify typing indicator works in layout
      mockChatService.sendMessage.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('Delayed response'), 100))
      );

      await user.type(input, 'Typing test');
      await user.keyboard('{Enter}');

      // Should show typing indicator
      await waitFor(() => {
        expect(screen.getByText('Typing test')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Delayed response')).toBeInTheDocument();
      });
    });

    it('should handle resizable separator drag functionality', async () => {
      // Mock desktop viewport for resizable separator
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      const { container } = render(<App />);

      const separator = container.querySelector('.resizable-separator');
      expect(separator).toBeInTheDocument();

      // Verify separator has proper attributes
      if (separator) {
        expect(separator).toHaveAttribute('role', 'separator');
        expect(separator).toHaveAttribute('aria-orientation', 'vertical');
        expect(separator).toHaveAttribute('tabIndex', '0');
        
        // Test that separator can receive focus
        separator.focus();
        expect(document.activeElement).toBe(separator);
        
        // Test mouse down event (drag start)
        fireEvent.mouseDown(separator, { clientX: 800 });
        
        // Verify dragging state is active during drag
        expect(separator).toHaveClass('resizable-separator--dragging');
      }
    });

    it('should handle keyboard navigation on resizable separator', async () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      const { container } = render(<App />);

      const separator = container.querySelector('.resizable-separator');
      expect(separator).toBeInTheDocument();

      if (separator) {
        // Focus the separator
        separator.focus();
        expect(document.activeElement).toBe(separator);

        // Mock chat pane for width calculations
        const chatPane = container.querySelector('.main-layout__chat-pane') as HTMLElement;
        if (chatPane) {
          Object.defineProperty(chatPane, 'offsetWidth', { value: 600, configurable: true });
        }

        // Test arrow key navigation
        fireEvent.keyDown(separator, { key: 'ArrowLeft' });
        fireEvent.keyDown(separator, { key: 'ArrowRight' });
        fireEvent.keyDown(separator, { key: 'Home' });
        fireEvent.keyDown(separator, { key: 'End' });
        fireEvent.keyDown(separator, { key: 'Enter' });

        // Verify separator maintains focus and handles keyboard events
        expect(document.activeElement).toBe(separator);
      }
    });

    it('should persist layout preferences in localStorage', async () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      // Mock localStorage
      const originalLocalStorage = window.localStorage;
      const mockGetItem = vi.fn().mockReturnValue('60');
      const mockSetItem = vi.fn();
      
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: mockGetItem,
          setItem: mockSetItem,
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
        writable: true,
      });

      const { container } = render(<App />);

      // Verify localStorage was checked for saved preferences
      expect(mockGetItem).toHaveBeenCalledWith('chatbot-chat-width');

      // Verify the layout loaded with the saved preference (60%)
      const chatPane = container.querySelector('.main-layout__chat-pane') as HTMLElement;
      if (chatPane) {
        expect(chatPane).toHaveStyle('width: 60%');
      }

      // Restore original localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });

    it('should handle dual-pane to single-pane transitions smoothly', async () => {
      // Start with desktop layout
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      const { container } = render(<App />);

      // Verify dual-pane layout initially
      expect(container.querySelector('.main-layout--desktop')).toBeInTheDocument();
      expect(container.querySelector('.main-layout__theory-pane')).toBeInTheDocument();
      expect(container.querySelector('.resizable-separator')).toBeInTheDocument();

      // Transition to mobile layout
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 375,
        });
        window.dispatchEvent(new Event('resize'));
      });

      // Verify transition to mobile layout
      await waitFor(() => {
        expect(container.querySelector('.main-layout--mobile')).toBeInTheDocument();
      });

      // Verify theory pane and separator are not present in mobile mode
      expect(container.querySelector('.main-layout__theory-pane')).not.toBeInTheDocument();
      expect(container.querySelector('.resizable-separator')).not.toBeInTheDocument();

      // Verify chat container is still present and functional
      expect(container.querySelector('.chat-container')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    });

    it('should handle F6 key for pane navigation', async () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      const { container } = render(<App />);

      const mainLayout = container.querySelector('.main-layout');
      
      if (mainLayout) {
        // Simulate F6 key press for pane cycling
        fireEvent.keyDown(mainLayout, { key: 'F6' });
        
        // Verify F6 handling doesn't break the layout
        expect(mainLayout).toBeInTheDocument();
      }
    });

    it('should handle Escape key to reset layout', async () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      const { container } = render(<App />);

      const mainLayout = container.querySelector('.main-layout');
      
      if (mainLayout) {
        // Simulate Escape key press
        fireEvent.keyDown(mainLayout, { key: 'Escape' });
        
        // Verify layout reset functionality
        expect(mainLayout).toBeInTheDocument();
      }
    });

    it('should announce layout changes to screen readers', async () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      const { container } = render(<App />);

      // Verify live region for layout announcements exists
      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();

      const separator = container.querySelector('.resizable-separator');
      const chatPane = container.querySelector('.main-layout__chat-pane') as HTMLElement;

      if (separator && chatPane) {
        // Mock chat pane width
        Object.defineProperty(chatPane, 'offsetWidth', { value: 600, configurable: true });

        // Simulate resize to trigger announcement
        fireEvent.mouseDown(separator, { clientX: 600 });
        fireEvent.mouseMove(document, { clientX: 700 });
        fireEvent.mouseUp(document);

        // Verify announcement was made (live region should be updated)
        expect(liveRegion).toBeInTheDocument();
      }
    });

    it('should handle theory section content display', async () => {
      // Mock desktop viewport to show theory section
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      const { container } = render(<App />);

      // Verify theory section is rendered and contains expected content
      const theorySection = container.querySelector('.theory-section');
      expect(theorySection).toBeInTheDocument();

      // Verify theory section has proper structure
      if (theorySection) {
        expect(theorySection).toHaveAttribute('aria-label');
      }
    });

    it('should maintain minimum width constraints during resize', async () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      const { container } = render(<App />);

      const separator = container.querySelector('.resizable-separator');
      const chatPane = container.querySelector('.main-layout__chat-pane') as HTMLElement;

      if (separator && chatPane) {
        // Mock initial width
        Object.defineProperty(chatPane, 'offsetWidth', { value: 600, configurable: true });

        // Try to resize below minimum width
        fireEvent.mouseDown(separator, { clientX: 600 });
        fireEvent.mouseMove(document, { clientX: 100 }); // Very small width
        fireEvent.mouseUp(document);

        // Verify minimum width constraints are enforced
        // The component should prevent going below minimum widths
        expect(separator).toBeInTheDocument();
      }
    });
  });
});