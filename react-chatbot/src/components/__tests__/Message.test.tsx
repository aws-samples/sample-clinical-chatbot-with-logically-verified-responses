import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Message from '../Message';
import type { Message as MessageType } from '../../types/chat';

// Mock CSS imports
vi.mock('../../styles/Message.css', () => ({}));

describe('Message Component', () => {
  const mockMessage: MessageType = {
    id: '1',
    content: 'Hello, this is a test message',
    sender: 'user',
    timestamp: new Date('2023-12-01T10:30:00Z'),
    status: 'sent'
  };

  it('renders message content correctly', () => {
    render(<Message message={mockMessage} />);
    
    expect(screen.getByText('Hello, this is a test message')).toBeInTheDocument();
  });

  it('displays formatted timestamp', () => {
    render(<Message message={mockMessage} />);
    
    const timeElement = screen.getByRole('time');
    expect(timeElement).toBeInTheDocument();
    expect(timeElement).toHaveAttribute('datetime', '2023-12-01T10:30:00.000Z');
  });

  it('applies correct CSS classes based on sender', () => {
    const { container } = render(<Message message={mockMessage} />);
    
    const messageWrapper = container.querySelector('.message-wrapper');
    expect(messageWrapper).toHaveClass('message-wrapper', 'user');
    
    const messageBubble = container.querySelector('.message-bubble');
    expect(messageBubble).toHaveClass('message-bubble', 'user');
  });

  it('displays status indicator when status is provided', () => {
    render(<Message message={mockMessage} />);
    
    expect(screen.getByText('Sent')).toBeInTheDocument();
    expect(screen.getByLabelText('Message status: Sent')).toBeInTheDocument();
  });

  it('displays different status messages correctly', () => {
    const sendingMessage = { ...mockMessage, status: 'sending' as const };
    const { rerender } = render(<Message message={sendingMessage} />);
    expect(screen.getByText('Sending...')).toBeInTheDocument();

    const errorMessage = { ...mockMessage, status: 'error' as const };
    rerender(<Message message={errorMessage} />);
    expect(screen.getByText('Failed to send')).toBeInTheDocument();

    const sentMessage = { ...mockMessage, status: 'sent' as const };
    rerender(<Message message={sentMessage} />);
    expect(screen.getByText('Sent')).toBeInTheDocument();
  });

  it('does not display status indicator when status is not provided', () => {
    const messageWithoutStatus = { ...mockMessage, status: undefined };
    render(<Message message={messageWithoutStatus} />);
    
    expect(screen.queryByText('Sent')).not.toBeInTheDocument();
    expect(screen.queryByText('Sending...')).not.toBeInTheDocument();
    expect(screen.queryByText('Failed to send')).not.toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<Message message={mockMessage} />);
    
    const messageWrapper = screen.getByRole('article');
    expect(messageWrapper).toHaveAttribute('aria-label', 'You said: Hello, this is a test message');
    
    const timeElement = screen.getByRole('time');
    // Check that aria-label contains the expected format, accounting for timezone conversion
    const ariaLabel = timeElement.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/^Sent at \d{1,2}:\d{2} (AM|PM)$/);
  });

  it('handles assistant messages correctly', () => {
    const assistantMessage = { ...mockMessage, sender: 'assistant' as const };
    const { container } = render(<Message message={assistantMessage} />);
    
    const messageWrapper = container.querySelector('.message-wrapper');
    expect(messageWrapper).toHaveClass('message-wrapper', 'assistant');
    expect(messageWrapper).toHaveAttribute('aria-label', 'Assistant said: Hello, this is a test message');
  });

  it('formats timestamp correctly for different times', () => {
    const morningMessage = { ...mockMessage, timestamp: new Date('2023-12-01T09:15:00Z') };
    const { rerender } = render(<Message message={morningMessage} />);
    
    let timeElement = screen.getByRole('time');
    let ariaLabel = timeElement.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/^Sent at \d{1,2}:\d{2} (AM|PM)$/);

    const eveningMessage = { ...mockMessage, timestamp: new Date('2023-12-01T21:45:00Z') };
    rerender(<Message message={eveningMessage} />);
    
    timeElement = screen.getByRole('time');
    ariaLabel = timeElement.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/^Sent at \d{1,2}:\d{2} (AM|PM)$/);
  });
});