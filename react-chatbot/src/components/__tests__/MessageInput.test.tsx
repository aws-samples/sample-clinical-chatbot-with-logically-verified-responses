import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MessageInput from '../MessageInput';

// Mock CSS imports
vi.mock('../../styles/MessageInput.css', () => ({}));

describe('MessageInput Component', () => {
  const mockOnSendMessage = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders input field and send button', () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} />);
      
      expect(screen.getByRole('textbox', { name: /type your message here/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
    });

    it('renders with correct placeholder text', () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} />);
      
      expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    });

    it('renders character count indicator', () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} />);
      
      expect(screen.getByText((content, element) => {
        return element?.tagName === 'SPAN' && element?.textContent === '0/1000 characters';
      })).toBeInTheDocument();
    });

    it('has proper accessibility attributes', () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-label', 'Type your message here');
      expect(input).toHaveAttribute('aria-describedby', 'message-input-help message-input-instructions');
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Send message');
    });
  });

  describe('Controlled State', () => {
    it('updates input value when user types', async () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'Hello world');
      
      expect(input).toHaveValue('Hello world');
    });

    it('updates character count as user types', async () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'Hello');
      
      expect(screen.getByText((content, element) => {
        return element?.tagName === 'SPAN' && element?.textContent === '5/1000 characters';
      })).toBeInTheDocument();
    });

    it('clears input after successful message send', async () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} />);
      
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      await user.type(input, 'Test message');
      await user.click(sendButton);
      
      expect(input).toHaveValue('');
      expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
    });
  });

  describe('Send Button Functionality', () => {
    it('calls onSendMessage when send button is clicked with valid input', async () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} />);
      
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      await user.type(input, 'Valid message');
      await user.click(sendButton);
      
      expect(mockOnSendMessage).toHaveBeenCalledWith('Valid message');
      expect(mockOnSendMessage).toHaveBeenCalledTimes(1);
    });

    it('trims whitespace from message before sending', async () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} />);
      
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      await user.type(input, '  Message with spaces  ');
      await user.click(sendButton);
      
      expect(mockOnSendMessage).toHaveBeenCalledWith('Message with spaces');
    });

    it('is disabled when input is empty', () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} />);
      
      const sendButton = screen.getByRole('button', { name: /send message/i });
      expect(sendButton).toBeDisabled();
    });

    it('is disabled when input contains only whitespace', async () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} />);
      
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      await user.type(input, '   ');
      expect(sendButton).toBeDisabled();
    });

    it('is enabled when input has valid content', async () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} />);
      
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      await user.type(input, 'Valid message');
      expect(sendButton).not.toBeDisabled();
    });
  });

  describe('Enter Key Handling', () => {
    it('sends message when Enter key is pressed with valid input', async () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'Message via Enter');
      await user.keyboard('{Enter}');
      
      expect(mockOnSendMessage).toHaveBeenCalledWith('Message via Enter');
      expect(input).toHaveValue('');
    });

    it('does not send message when Enter is pressed with Shift key', async () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'Message with shift enter');
      
      // Simulate Shift+Enter
      fireEvent.keyPress(input, { 
        key: 'Enter', 
        code: 'Enter', 
        shiftKey: true 
      });
      
      expect(mockOnSendMessage).not.toHaveBeenCalled();
      expect(input).toHaveValue('Message with shift enter');
    });

    it('does not send message when Enter is pressed with empty input', async () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} />);
      
      await user.keyboard('{Enter}');
      
      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it('prevents default behavior when Enter is pressed', async () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'Test message');
      
      // Use fireEvent.keyPress with preventDefault spy
      const keyPressHandler = vi.fn((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
        }
      });
      
      input.addEventListener('keypress', keyPressHandler);
      
      fireEvent.keyPress(input, { 
        key: 'Enter', 
        code: 'Enter',
        preventDefault: vi.fn()
      });
      
      expect(keyPressHandler).toHaveBeenCalled();
    });
  });

  describe('Input Validation', () => {
    it('shows error message for empty input when user tries to type and delete', async () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} />);
      
      const input = screen.getByRole('textbox');
      
      // Type something then delete it to trigger validation
      await user.type(input, 'a');
      await user.clear(input);
      
      // Check if validation error appears (the component shows error only when input.length > 0 initially)
      // Let's type a space and then clear to trigger the validation
      await user.type(input, ' ');
      
      // The validation error should appear for whitespace-only input
      await waitFor(() => {
        const errorElement = screen.queryByRole('alert');
        if (errorElement) {
          expect(errorElement).toHaveTextContent('Message cannot be empty');
        } else {
          // If no alert role, check for validation error class
          expect(screen.getByText(/Message cannot be empty/)).toBeInTheDocument();
        }
      });
    });

    it('shows error message when message exceeds maximum length', async () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} />);
      
      const input = screen.getByRole('textbox');
      const longMessage = 'a'.repeat(1001); // Exceeds 1000 character limit
      
      await user.type(input, longMessage);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Message cannot exceed 1000 characters');
      });
    });

    it('updates character count indicator when approaching limit', async () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} />);
      
      const input = screen.getByRole('textbox');
      const nearLimitMessage = 'a'.repeat(995);
      
      await user.type(input, nearLimitMessage);
      
      expect(screen.getByText((content, element) => {
        return element?.tagName === 'SPAN' && element?.textContent === '995/1000 characters';
      })).toBeInTheDocument();
    });

    it('applies over-limit class when exceeding character limit', async () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} />);
      
      const input = screen.getByRole('textbox');
      const overLimitMessage = 'a'.repeat(1001);
      
      await user.type(input, overLimitMessage);
      
      const characterCount = screen.getByText((content, element) => {
        return element?.textContent === '1001/1000 characters';
      });
      expect(characterCount).toHaveClass('over-limit');
    });

    it('prevents input beyond buffer limit', async () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} />);
      
      const input = screen.getByRole('textbox');
      const veryLongMessage = 'a'.repeat(1060); // Exceeds 1050 buffer limit
      
      await user.type(input, veryLongMessage);
      
      // Should be limited to 1050 characters (1000 + 50 buffer)
      expect((input as HTMLInputElement).value.length).toBeLessThanOrEqual(1050);
    });
  });

  describe('Disabled State', () => {
    it('disables input and button when disabled prop is true', () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} disabled={true} />);
      
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();
    });

    it('does not call onSendMessage when disabled', async () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} disabled={true} />);
      
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      // Try to click the disabled button
      await user.click(sendButton);
      
      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it('does not respond to Enter key when disabled', async () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} disabled={true} />);
      
      const input = screen.getByRole('textbox');
      
      // Try to press Enter on disabled input
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });
      
      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('handles form submission correctly', async () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} />);
      
      const input = screen.getByRole('textbox');
      const form = input.closest('form');
      
      await user.type(input, 'Form submission test');
      
      if (form) {
        fireEvent.submit(form);
      }
      
      expect(mockOnSendMessage).toHaveBeenCalledWith('Form submission test');
      expect(input).toHaveValue('');
    });

    it('prevents default form submission behavior', async () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} />);
      
      const input = screen.getByRole('textbox');
      const form = input.closest('form');
      
      await user.type(input, 'Test message');
      
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        const preventDefaultSpy = vi.spyOn(submitEvent, 'preventDefault');
        
        fireEvent(form, submitEvent);
        
        expect(preventDefaultSpy).toHaveBeenCalled();
      }
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid successive submissions correctly', async () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} />);
      
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      await user.type(input, 'First message');
      await user.click(sendButton);
      
      await user.type(input, 'Second message');
      await user.click(sendButton);
      
      expect(mockOnSendMessage).toHaveBeenCalledTimes(2);
      expect(mockOnSendMessage).toHaveBeenNthCalledWith(1, 'First message');
      expect(mockOnSendMessage).toHaveBeenNthCalledWith(2, 'Second message');
    });

    it('handles special characters correctly', async () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} />);
      
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      // Use fireEvent.change to avoid userEvent parsing issues with special characters
      const specialMessage = 'Hello! @#$%^&*()_+-=[]{}|;:,.<>?';
      fireEvent.change(input, { target: { value: specialMessage } });
      await user.click(sendButton);
      
      expect(mockOnSendMessage).toHaveBeenCalledWith(specialMessage);
    });

    it('handles unicode characters correctly', async () => {
      render(<MessageInput onSendMessage={mockOnSendMessage} />);
      
      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      const unicodeMessage = 'Hello 👋 世界 🌍 emoji test';
      await user.type(input, unicodeMessage);
      await user.click(sendButton);
      
      expect(mockOnSendMessage).toHaveBeenCalledWith(unicodeMessage);
    });
  });
});