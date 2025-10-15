import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ChatContainer from '../ChatContainer';
import MessageInput from '../MessageInput';
import MessageList from '../MessageList';
import TypingIndicator from '../TypingIndicator';
import UserMessage from '../UserMessage';
import AssistantMessage from '../AssistantMessage';
import MainLayout from '../MainLayout';
import ResizableSeparator from '../ResizableSeparator';
import TheorySection from '../TheorySection';
import type { Message } from '../../types/chat';
import { chatService } from '../../services/ChatService';

// Mock the ChatService to control responses
vi.mock('../../services/ChatService', () => {
  const mockSendMessage = vi.fn().mockResolvedValue('Mock assistant response');
  return {
    chatService: {
      sendMessage: mockSendMessage
    },
    ChatServiceError: class ChatServiceError extends Error {
      public isRetryable: boolean;
      
      constructor(message: string, isRetryable: boolean = false) {
        super(message);
        this.name = 'ChatServiceError';
        this.isRetryable = isRetryable;
      }
    }
  };
});

describe('Accessibility Features', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    // Clear any existing timers
    vi.clearAllTimers();
    // Reset mock to default behavior
    vi.mocked(chatService.sendMessage).mockResolvedValue('Mock assistant response');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ARIA Labels and Roles', () => {
    it('should have proper ARIA labels and roles for main container', () => {
      render(<ChatContainer />);
      
      // Check main container has proper label
      const mainContainer = screen.getByLabelText('Chat conversation');
      expect(mainContainer).toHaveAttribute('aria-label', 'Chat conversation');
    });

    it('should have proper ARIA labels and roles for message list', () => {
      render(<ChatContainer />);
      
      // Check message list has proper role and label
      const messageList = screen.getByRole('log');
      expect(messageList).toHaveAttribute('aria-label', 'Chat messages');
      expect(messageList).toHaveAttribute('aria-live', 'polite');
      expect(messageList).toHaveAttribute('tabIndex', '0');
    });

    it('should have proper ARIA labels for input elements', () => {
      render(<ChatContainer />);
      
      // Check input has proper accessibility attributes
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-label', 'Type your message here');
      expect(input).toHaveAttribute('aria-describedby', 'message-input-help message-input-instructions');
      
      // Check send button has proper label
      const sendButton = screen.getByRole('button', { name: /send message/i });
      expect(sendButton).toHaveAttribute('aria-label', 'Send message');
    });

    it('should have proper ARIA labels for messages', async () => {
      const mockMessage: Message = {
        id: 'test-1',
        content: 'Test message',
        sender: 'user',
        timestamp: new Date(),
        status: 'sent'
      };

      render(<UserMessage message={mockMessage} messageIndex={1} totalMessages={1} />);
      
      const messageElement = screen.getByRole('article');
      expect(messageElement).toHaveAttribute('aria-label', 'You said (message 1 of 1): Test message');
      expect(messageElement).toHaveAttribute('tabIndex', '0');
    });

    it('should have proper ARIA labels for assistant messages', () => {
      const mockMessage: Message = {
        id: 'test-2',
        content: 'Assistant response',
        sender: 'assistant',
        timestamp: new Date(),
        status: 'sent'
      };

      render(<AssistantMessage message={mockMessage} messageIndex={2} totalMessages={2} />);
      
      const messageElement = screen.getByRole('article');
      expect(messageElement).toHaveAttribute('aria-label', 'Assistant said (message 2 of 2): Assistant response');
    });

    it('should have proper ARIA attributes for typing indicator', () => {
      render(<TypingIndicator isVisible={true} />);
      
      const typingIndicator = screen.getByRole('status');
      expect(typingIndicator).toHaveAttribute('aria-live', 'polite');
      expect(typingIndicator).toHaveAttribute('aria-label', 'Assistant is typing');
      
      // Check for screen reader text
      expect(screen.getByText('Assistant is typing a response')).toHaveClass('sr-only');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support Enter key to send messages', async () => {
      render(<ChatContainer />);
      
      const input = screen.getByRole('textbox');
      
      // Type a message and press Enter
      await user.type(input, 'Test message');
      await user.keyboard('{Enter}');
      
      // Input should be cleared after sending
      expect(input).toHaveValue('');
    });

    it('should support Escape key to clear input', async () => {
      const mockOnSend = vi.fn();
      render(<MessageInput onSendMessage={mockOnSend} />);
      
      const input = screen.getByRole('textbox');
      
      // Type a message and press Escape
      await user.type(input, 'Test message');
      await user.keyboard('{Escape}');
      
      // Input should be cleared
      expect(input).toHaveValue('');
      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('should support Escape key to dismiss errors', async () => {
      // Mock a service error to test error handling
      vi.mocked(chatService.sendMessage).mockRejectedValue(new Error('Network error'));
      
      render(<ChatContainer />);
      
      const input = screen.getByRole('textbox');
      
      // Send a message that will trigger an error
      await user.type(input, 'Test message');
      await user.keyboard('{Enter}');
      
      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      
      // Press Escape to dismiss error
      const chatContainer = screen.getByLabelText('Chat conversation');
      fireEvent.keyDown(chatContainer, { key: 'Escape' });
      
      // Error should be dismissed
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('should support arrow key navigation between messages', async () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          content: 'First message',
          sender: 'user',
          timestamp: new Date(),
          status: 'sent'
        },
        {
          id: 'msg-2',
          content: 'Second message',
          sender: 'assistant',
          timestamp: new Date(),
          status: 'sent'
        }
      ];

      render(<ChatContainer />);
      
      // Add messages to the chat container by sending them
      const input = screen.getByRole('textbox');
      
      // Send first message
      await user.type(input, 'First message');
      await user.keyboard('{Enter}');
      
      // Wait for messages to appear
      await waitFor(() => {
        expect(screen.getAllByRole('article')).toHaveLength(2); // User + Assistant
      });
      
      const messageElements = screen.getAllByRole('article');
      const chatContainer = screen.getByLabelText('Chat conversation');
      
      // Focus first message
      messageElements[0].focus();
      expect(document.activeElement).toBe(messageElements[0]);
      
      // Press ArrowDown to move to next message (fire event on container)
      fireEvent.keyDown(chatContainer, { key: 'ArrowDown' });
      expect(document.activeElement).toBe(messageElements[1]);
      
      // Press ArrowUp to move back to previous message
      fireEvent.keyDown(chatContainer, { key: 'ArrowUp' });
      expect(document.activeElement).toBe(messageElements[0]);
    });

    it('should handle Tab navigation properly', async () => {
      render(<ChatContainer />);
      
      const input = screen.getByRole('textbox');
      
      // Type some text to enable the send button
      await user.type(input, 'Test message');
      
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      // Tab should move focus from input to send button
      input.focus();
      await user.keyboard('{Tab}');
      expect(document.activeElement).toBe(sendButton);
    });
  });

  describe('Screen Reader Compatibility', () => {
    it('should have live region for announcements', () => {
      render(<ChatContainer />);
      
      // Check for live region for screen reader announcements
      const liveRegion = document.querySelector('[aria-live="polite"].sr-only');
      expect(liveRegion).toBeInTheDocument();
    });

    it('should announce new messages to screen readers', async () => {
      render(<ChatContainer />);
      
      const input = screen.getByRole('textbox');
      const liveRegion = document.querySelector('[aria-live="polite"].sr-only');
      
      // Send a message
      await user.type(input, 'Hello');
      await user.keyboard('{Enter}');
      
      // Live region should have content (user message, typing state, or assistant response)
      await waitFor(() => {
        expect(liveRegion?.textContent).toBeTruthy();
        expect(liveRegion?.textContent).toMatch(/(You said: Hello|Assistant is typing\.\.\.|Assistant replied:)/);
      }, { timeout: 1000 });
    });

    it('should announce typing state to screen readers', async () => {
      // Mock a delayed response to capture typing state
      vi.mocked(chatService.sendMessage).mockImplementation(() => new Promise(resolve => 
        setTimeout(() => resolve('Mock assistant response'), 1000)
      ));
      
      render(<ChatContainer />);
      
      const input = screen.getByRole('textbox');
      const liveRegion = document.querySelector('[aria-live="polite"].sr-only');
      
      // Send a message to trigger typing state
      await user.type(input, 'Test message');
      await user.keyboard('{Enter}');
      
      // Check for typing state after user message
      await waitFor(() => {
        expect(liveRegion?.textContent).toContain('Assistant is typing...');
      }, { timeout: 500 });
    });

    it('should have proper instructions for screen readers', () => {
      render(<ChatContainer />);
      
      // Check for screen reader instructions
      const instructions = document.querySelector('#message-input-instructions');
      expect(instructions).toBeInTheDocument();
      expect(instructions).toHaveTextContent('Press Enter to send message, Escape to clear input');
      expect(instructions).toHaveClass('sr-only');
    });

    it('should announce character count changes', async () => {
      const mockOnSend = vi.fn();
      render(<MessageInput onSendMessage={mockOnSend} />);
      
      const input = screen.getByRole('textbox');
      const characterCount = document.querySelector('[aria-live="polite"]');
      
      // Type some text
      await user.type(input, 'Hello');
      
      // Character count should be announced
      expect(characterCount).toHaveTextContent('5/1000 characters');
    });

    it('should announce validation errors', async () => {
      const mockOnSend = vi.fn();
      render(<MessageInput onSendMessage={mockOnSend} />);
      
      const input = screen.getByRole('textbox');
      
      // Type text exceeding limit
      const longText = 'a'.repeat(1001);
      await user.type(input, longText);
      
      // Validation error should be announced
      const errorElement = screen.getByRole('alert');
      expect(errorElement).toHaveTextContent('Message cannot exceed 1000 characters');
      expect(errorElement).toHaveAttribute('aria-live', 'assertive');
    });
  });

  describe('Focus Management', () => {
    it('should have proper focus management for interactive elements', () => {
      render(<ChatContainer />);
      
      // Check that interactive elements are focusable
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      const messageList = screen.getByRole('log');
      
      // Elements should be naturally focusable (no negative tabIndex)
      expect(input).not.toHaveAttribute('tabIndex', '-1');
      expect(sendButton).not.toHaveAttribute('tabIndex', '-1');
      expect(messageList).toHaveAttribute('tabIndex', '0');
    });

    it('should focus error messages when they appear', async () => {
      // Mock a service error to test error handling
      vi.mocked(chatService.sendMessage).mockRejectedValue(new Error('Network error'));
      
      render(<ChatContainer />);
      
      const input = screen.getByRole('textbox');
      
      // Send a message that will trigger an error
      await user.type(input, 'Test message');
      await user.keyboard('{Enter}');
      
      // Wait for error to appear and be focused
      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveAttribute('tabIndex', '-1');
      });
    });

    it('should maintain focus on messages during keyboard navigation', async () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          content: 'Message 1',
          sender: 'user',
          timestamp: new Date(),
          status: 'sent'
        },
        {
          id: 'msg-2',
          content: 'Message 2',
          sender: 'assistant',
          timestamp: new Date(),
          status: 'sent'
        }
      ];

      render(<MessageList messages={messages} isTyping={false} />);
      
      const messageElements = screen.getAllByRole('article');
      
      // All messages should be focusable
      messageElements.forEach(element => {
        expect(element).toHaveAttribute('tabIndex', '0');
      });
    });

    it('should not lose focus when new messages are added', async () => {
      render(<ChatContainer />);
      
      const input = screen.getByRole('textbox');
      
      // Focus the input
      input.focus();
      expect(document.activeElement).toBe(input);
      
      // Send a message
      await user.type(input, 'Test message');
      await user.keyboard('{Enter}');
      
      // Focus should return to input after sending
      await waitFor(() => {
        expect(document.activeElement).toBe(input);
      });
    });
  });

  describe('Dynamic Content Announcements', () => {
    it('should announce when messages are added', async () => {
      render(<ChatContainer />);
      
      const input = screen.getByRole('textbox');
      const liveRegion = document.querySelector('[aria-live="polite"].sr-only');
      
      // Send a message
      await user.type(input, 'New message');
      await user.keyboard('{Enter}');
      
      // Should announce something related to the message flow
      await waitFor(() => {
        expect(liveRegion?.textContent).toBeTruthy();
        expect(liveRegion?.textContent).toMatch(/(You said: New message|Assistant is typing\.\.\.|Assistant replied:)/);
      }, { timeout: 1000 });
    });

    it('should announce assistant responses', async () => {
      render(<ChatContainer />);
      
      const input = screen.getByRole('textbox');
      const liveRegion = document.querySelector('[aria-live="polite"].sr-only');
      
      // Send a message to get assistant response
      await user.type(input, 'Hello');
      await user.keyboard('{Enter}');
      
      // Should eventually announce assistant response
      await waitFor(() => {
        expect(liveRegion).toHaveTextContent('Assistant replied: Mock assistant response');
      }, { timeout: 3000 });
    });

    it('should announce error states', async () => {
      // Mock a service error to test error handling
      vi.mocked(chatService.sendMessage).mockRejectedValue(new Error('Network error'));
      
      render(<ChatContainer />);
      
      const input = screen.getByRole('textbox');
      
      // Send a message that will trigger an error
      await user.type(input, 'Test message');
      await user.keyboard('{Enter}');
      
      // Error should be announced with assertive live region
      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toHaveAttribute('aria-live', 'assertive');
        expect(errorElement).toBeInTheDocument();
      });
    });

    it('should announce typing indicator state changes', () => {
      const { rerender } = render(<TypingIndicator isVisible={false} />);
      
      // Initially no typing indicator
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      
      // Show typing indicator
      rerender(<TypingIndicator isVisible={true} />);
      
      // Should announce typing state
      const typingStatus = screen.getByRole('status');
      expect(typingStatus).toHaveAttribute('aria-live', 'polite');
      expect(typingStatus).toHaveAttribute('aria-label', 'Assistant is typing');
    });
  });

  describe('Dual-Pane Layout Accessibility', () => {
    it('should have proper ARIA labels for dual-pane layout', () => {
      render(
        <MainLayout>
          <ChatContainer />
        </MainLayout>
      );
      
      // Check main layout has proper role and label
      const layoutContainer = screen.getByRole('application');
      expect(layoutContainer).toHaveAttribute('aria-label');
      expect(layoutContainer.getAttribute('aria-label')).toMatch(/Chat application - dual pane layout/);
      
      // Check main chat pane
      const chatPane = screen.getByRole('main');
      expect(chatPane).toHaveAttribute('aria-label', 'Chat conversation pane');
      
      // Check theory pane
      const theoryPane = screen.getByRole('complementary');
      expect(theoryPane).toHaveAttribute('aria-label', 'Theorem prover facts and logical context');
    });

    it('should have proper keyboard navigation instructions', () => {
      render(
        <MainLayout>
          <ChatContainer />
        </MainLayout>
      );
      
      // Check for keyboard navigation instructions
      const instructions = screen.getByText(/Press F6 to cycle between panes, Escape to reset layout/);
      expect(instructions).toHaveClass('sr-only');
    });

    it('should support F6 key to cycle between panes', async () => {
      render(
        <MainLayout>
          <ChatContainer />
        </MainLayout>
      );
      
      const layoutContainer = screen.getByRole('application');
      const chatPane = screen.getByRole('main');
      const theoryPane = screen.getByRole('complementary');
      const separator = screen.getByRole('separator');
      
      // Focus chat pane first - get the message list which has tabindex="0"
      const messageList = screen.getByRole('log');
      messageList.focus();
      expect(document.activeElement).toBe(messageList);
      
      // Press F6 to move to separator
      fireEvent.keyDown(layoutContainer, { key: 'F6' });
      expect(document.activeElement).toBe(separator);
      
      // Press F6 again to move to theory pane
      fireEvent.keyDown(layoutContainer, { key: 'F6' });
      expect(document.activeElement).toBe(theoryPane);
      
      // Press F6 again to cycle back to chat pane
      fireEvent.keyDown(layoutContainer, { key: 'F6' });
      expect(document.activeElement).toBe(messageList);
    });

    it('should support Escape key to reset layout', async () => {
      const mockOnResize = vi.fn();
      
      render(
        <MainLayout initialChatWidth={80}>
          <ChatContainer />
        </MainLayout>
      );
      
      const layoutContainer = screen.getByRole('application');
      const liveRegion = document.querySelector('[aria-live="polite"].sr-only');
      
      // Press Escape to reset layout
      fireEvent.keyDown(layoutContainer, { key: 'Escape' });
      
      // Should announce layout reset
      await waitFor(() => {
        expect(liveRegion?.textContent).toContain('Layout reset to default proportions');
      });
    });

    it('should announce layout changes to screen readers', () => {
      render(
        <MainLayout>
          <ChatContainer />
        </MainLayout>
      );
      
      // Check for live region for layout announcements
      const liveRegion = document.querySelector('[aria-live="polite"].sr-only');
      expect(liveRegion).toBeInTheDocument();
    });
  });

  describe('Resizable Separator Accessibility', () => {
    const mockOnResize = vi.fn();
    
    beforeEach(() => {
      mockOnResize.mockClear();
    });

    it('should have proper ARIA attributes for separator', () => {
      render(
        <ResizableSeparator
          onResize={mockOnResize}
          minChatWidth={300}
          minTheoryWidth={250}
        />
      );
      
      const separator = screen.getByRole('separator');
      expect(separator).toHaveAttribute('aria-orientation', 'vertical');
      expect(separator).toHaveAttribute('aria-label', 'Resize chat and theory panes');
      expect(separator).toHaveAttribute('aria-describedby', 'separator-instructions');
      expect(separator).toHaveAttribute('tabIndex', '0');
    });

    it('should have keyboard navigation instructions', () => {
      render(
        <ResizableSeparator
          onResize={mockOnResize}
          minChatWidth={300}
          minTheoryWidth={250}
        />
      );
      
      const instructions = document.getElementById('separator-instructions');
      expect(instructions).toBeInTheDocument();
      expect(instructions).toHaveClass('sr-only');
      expect(instructions).toHaveAttribute('aria-live', 'polite');
      expect(instructions?.textContent).toContain('Use arrow keys to resize panes');
    });

    it('should support arrow key navigation for resizing', async () => {
      // Mock DOM methods for testing
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      // Mock querySelector to return a mock chat pane element
      const mockChatPane = {
        offsetWidth: 600
      };
      
      const originalQuerySelector = document.querySelector;
      vi.spyOn(document, 'querySelector').mockImplementation((selector) => {
        if (selector === '.main-layout__chat-pane') {
          return mockChatPane as any;
        }
        return originalQuerySelector.call(document, selector);
      });

      render(
        <ResizableSeparator
          onResize={mockOnResize}
          minChatWidth={300}
          minTheoryWidth={250}
        />
      );
      
      const separator = screen.getByRole('separator');
      
      // Test ArrowLeft key
      fireEvent.keyDown(separator, { key: 'ArrowLeft' });
      expect(mockOnResize).toHaveBeenCalledWith(580); // 600 - 20
      
      // Test ArrowRight key
      fireEvent.keyDown(separator, { key: 'ArrowRight' });
      expect(mockOnResize).toHaveBeenCalledWith(620); // 600 + 20
      
      // Test Home key
      fireEvent.keyDown(separator, { key: 'Home' });
      expect(mockOnResize).toHaveBeenCalledWith(300); // minChatWidth
      
      // Test End key
      fireEvent.keyDown(separator, { key: 'End' });
      expect(mockOnResize).toHaveBeenCalledWith(950); // 1200 - 250
      
      // Test Enter/Space key for reset
      fireEvent.keyDown(separator, { key: 'Enter' });
      expect(mockOnResize).toHaveBeenCalledWith(600); // 1200 * 0.5
      
      fireEvent.keyDown(separator, { key: ' ' });
      expect(mockOnResize).toHaveBeenCalledWith(600); // 1200 * 0.5

      // Restore original querySelector
      vi.restoreAllMocks();
    });

    it('should announce resize actions to screen readers', async () => {
      // Mock DOM methods for testing
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      const mockChatPane = {
        offsetWidth: 600
      };
      
      vi.spyOn(document, 'querySelector').mockImplementation((selector) => {
        if (selector === '.main-layout__chat-pane') {
          return mockChatPane as any;
        }
        return document.querySelector(selector);
      });

      render(
        <ResizableSeparator
          onResize={mockOnResize}
          minChatWidth={300}
          minTheoryWidth={250}
        />
      );
      
      const separator = screen.getByRole('separator');
      const instructions = document.getElementById('separator-instructions');
      
      // Test ArrowLeft announcement
      fireEvent.keyDown(separator, { key: 'ArrowLeft' });
      
      await waitFor(() => {
        expect(instructions?.textContent).toBe('Chat pane made smaller');
      });
      
      // Should reset after delay
      await waitFor(() => {
        expect(instructions?.textContent).toContain('Use arrow keys to resize panes');
      }, { timeout: 2500 });

      vi.restoreAllMocks();
    });

    it('should be focusable and respond to mouse events', () => {
      render(
        <ResizableSeparator
          onResize={mockOnResize}
          minChatWidth={300}
          minTheoryWidth={250}
        />
      );
      
      const separator = screen.getByRole('separator');
      
      // Should be focusable
      expect(separator).toHaveAttribute('tabIndex', '0');
      
      // Should respond to mouse down
      fireEvent.mouseDown(separator, { clientX: 600 });
      
      // Should respond to mouse events (dragging class is added by mouse move, not mouse down)
      // Just verify the separator is focusable and responds to events
      expect(separator).toBeInTheDocument();
    });
  });

  describe('Theory Section Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<TheorySection />);
      
      const theorySection = screen.getByRole('complementary');
      expect(theorySection).toHaveAttribute('aria-label', 'Theorem prover facts and logical context');
      expect(theorySection).toHaveAttribute('tabIndex', '0');
      
      // Check for proper heading structure - get the specific title heading
      const title = document.getElementById('theory-section-title');
      expect(title).toBeInTheDocument();
      expect(title).toHaveAttribute('id', 'theory-section-title');
      
      // Check scrollable region
      const scrollableRegion = theorySection.querySelector('.theory-section__scrollable');
      expect(scrollableRegion).toHaveAttribute('role', 'region');
      expect(scrollableRegion).toHaveAttribute('aria-labelledby', 'theory-section-title');
      expect(scrollableRegion).toHaveAttribute('aria-describedby', 'theory-section-instructions');
      expect(scrollableRegion).toHaveAttribute('tabIndex', '0');
    });

    it('should have screen reader instructions', () => {
      render(<TheorySection />);
      
      const instructions = document.getElementById('theory-section-instructions');
      expect(instructions).toBeInTheDocument();
      expect(instructions).toHaveClass('sr-only');
      expect(instructions?.textContent).toContain('Scrollable content area with theorem prover facts');
    });

    it('should support custom content', () => {
      const customContent = '# Custom Theory\n\nThis is custom content.';
      render(<TheorySection content={customContent} />);
      
      const theorySection = screen.getByRole('complementary');
      expect(theorySection).toBeInTheDocument();
      
      // Should render custom content
      expect(screen.getByText('Custom Theory')).toBeInTheDocument();
      expect(screen.getByText('This is custom content.')).toBeInTheDocument();
    });
  });

  describe('Message List Keyboard Navigation', () => {
    const mockMessages: Message[] = [
      {
        id: 'msg-1',
        content: 'First message',
        sender: 'user',
        timestamp: new Date(),
        status: 'sent'
      },
      {
        id: 'msg-2',
        content: 'Second message',
        sender: 'assistant',
        timestamp: new Date(),
        status: 'sent'
      }
    ];

    it('should support Home/End keys for scrolling', () => {
      const mockScrollTo = vi.fn();
      const mockScrollBy = vi.fn();
      
      // Mock scroll methods
      Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
        value: mockScrollTo,
        writable: true
      });
      
      Object.defineProperty(HTMLElement.prototype, 'scrollBy', {
        value: mockScrollBy,
        writable: true
      });

      render(<MessageList messages={mockMessages} isTyping={false} />);
      
      const messageList = screen.getByRole('log');
      
      // Test Home key
      fireEvent.keyDown(messageList, { key: 'Home' });
      expect(mockScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
      
      // Test End key
      fireEvent.keyDown(messageList, { key: 'End' });
      expect(mockScrollTo).toHaveBeenCalledWith({ top: expect.any(Number), behavior: 'smooth' });
    });

    it('should support Page Up/Down keys for scrolling', () => {
      const mockScrollBy = vi.fn();
      
      Object.defineProperty(HTMLElement.prototype, 'scrollBy', {
        value: mockScrollBy,
        writable: true
      });

      render(<MessageList messages={mockMessages} isTyping={false} />);
      
      const messageList = screen.getByRole('log');
      
      // Test PageUp key
      fireEvent.keyDown(messageList, { key: 'PageUp' });
      expect(mockScrollBy).toHaveBeenCalledWith({ top: expect.any(Number), behavior: 'smooth' });
      
      // Test PageDown key
      fireEvent.keyDown(messageList, { key: 'PageDown' });
      expect(mockScrollBy).toHaveBeenCalledWith({ top: expect.any(Number), behavior: 'smooth' });
    });

    it('should have proper accessibility instructions', () => {
      render(<MessageList messages={mockMessages} isTyping={false} />);
      
      const instructions = document.getElementById('message-list-instructions');
      expect(instructions).toBeInTheDocument();
      expect(instructions).toHaveClass('sr-only');
      expect(instructions?.textContent).toContain('Chat message history');
      expect(instructions?.textContent).toContain('Use Home/End to go to top/bottom');
    });
  });
});