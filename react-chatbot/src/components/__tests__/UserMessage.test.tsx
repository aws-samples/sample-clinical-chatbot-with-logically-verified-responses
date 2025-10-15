import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import UserMessage from '../UserMessage';
import type { Message as MessageType } from '../../types/chat';

// Mock CSS imports
vi.mock('../../styles/Message.css', () => ({}));

describe('UserMessage Component', () => {
  const mockUserMessage: MessageType = {
    id: '1',
    content: 'Hello from user',
    sender: 'user',
    timestamp: new Date('2023-12-01T10:30:00Z'),
    status: 'sent'
  };

  it('renders user message content correctly', () => {
    render(<UserMessage message={mockUserMessage} />);
    
    expect(screen.getByText('Hello from user')).toBeInTheDocument();
  });

  it('applies correct CSS classes for user messages', () => {
    const { container } = render(<UserMessage message={mockUserMessage} />);
    
    const messageWrapper = container.querySelector('.message-wrapper');
    expect(messageWrapper).toHaveClass('message-wrapper', 'user', 'user-message');
    
    const messageBubble = container.querySelector('.message-bubble');
    expect(messageBubble).toHaveClass('message-bubble', 'user');
  });

  it('has proper accessibility attributes for user messages', () => {
    render(<UserMessage message={mockUserMessage} />);
    
    const messageWrapper = screen.getByRole('article');
    expect(messageWrapper).toHaveAttribute('aria-label', 'You said: Hello from user');
  });

  it('displays timestamp with correct formatting', () => {
    render(<UserMessage message={mockUserMessage} />);
    
    const timeElement = screen.getByRole('time');
    expect(timeElement).toBeInTheDocument();
    expect(timeElement).toHaveAttribute('datetime', '2023-12-01T10:30:00.000Z');
    
    // Check that aria-label contains the expected format, accounting for timezone conversion
    const ariaLabel = timeElement.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/^Sent at \d{1,2}:\d{2} (AM|PM)$/);
  });

  it('displays user-specific status messages', () => {
    const sendingMessage = { ...mockUserMessage, status: 'sending' as const };
    const { rerender } = render(<UserMessage message={sendingMessage} />);
    expect(screen.getByText('Sending...')).toBeInTheDocument();

    const sentMessage = { ...mockUserMessage, status: 'sent' as const };
    rerender(<UserMessage message={sentMessage} />);
    expect(screen.getByText('Sent')).toBeInTheDocument();

    const errorMessage = { ...mockUserMessage, status: 'error' as const };
    rerender(<UserMessage message={errorMessage} />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('does not display status when not provided', () => {
    const messageWithoutStatus = { ...mockUserMessage, status: undefined };
    render(<UserMessage message={messageWithoutStatus} />);
    
    expect(screen.queryByText('Sent')).not.toBeInTheDocument();
    expect(screen.queryByText('Sending...')).not.toBeInTheDocument();
    expect(screen.queryByText('Failed')).not.toBeInTheDocument();
  });

  it('warns and falls back to base Message component for non-user messages', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const assistantMessage = { ...mockUserMessage, sender: 'assistant' as const };
    
    render(<UserMessage message={assistantMessage} />);
    
    expect(consoleSpy).toHaveBeenCalledWith('UserMessage component should only be used for user messages');
    consoleSpy.mockRestore();
  });

  it('handles different message statuses with proper aria labels', () => {
    const sendingMessage = { ...mockUserMessage, status: 'sending' as const };
    render(<UserMessage message={sendingMessage} />);
    
    expect(screen.getByLabelText('Message status: sending')).toBeInTheDocument();
  });

  it('renders message content in correct structure', () => {
    const { container } = render(<UserMessage message={mockUserMessage} />);
    
    const messageContent = container.querySelector('.message-content');
    expect(messageContent).toBeInTheDocument();
    expect(messageContent).toHaveTextContent('Hello from user');
    
    const messageMeta = container.querySelector('.message-meta');
    expect(messageMeta).toBeInTheDocument();
  });

  it('formats different timestamps correctly', () => {
    const morningMessage = { ...mockUserMessage, timestamp: new Date('2023-12-01T08:00:00Z') };
    const { rerender } = render(<UserMessage message={morningMessage} />);
    
    let timeElement = screen.getByRole('time');
    let ariaLabel = timeElement.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/^Sent at \d{1,2}:\d{2} (AM|PM)$/);

    const afternoonMessage = { ...mockUserMessage, timestamp: new Date('2023-12-01T15:30:00Z') };
    rerender(<UserMessage message={afternoonMessage} />);
    
    timeElement = screen.getByRole('time');
    ariaLabel = timeElement.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/^Sent at \d{1,2}:\d{2} (AM|PM)$/);
  });
});