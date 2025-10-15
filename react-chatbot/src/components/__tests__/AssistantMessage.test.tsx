import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AssistantMessage from '../AssistantMessage';
import type { Message as MessageType } from '../../types/chat';

// Mock CSS imports
vi.mock('../../styles/Message.css', () => ({}));

describe('AssistantMessage Component', () => {
  const mockAssistantMessage: MessageType = {
    id: '1',
    content: 'Hello from assistant',
    sender: 'assistant',
    timestamp: new Date('2023-12-01T10:30:00Z'),
    status: 'sent'
  };

  it('renders assistant message content correctly', () => {
    render(<AssistantMessage message={mockAssistantMessage} />);
    
    expect(screen.getByText('Hello from assistant')).toBeInTheDocument();
  });

  it('applies correct CSS classes for assistant messages', () => {
    const { container } = render(<AssistantMessage message={mockAssistantMessage} />);
    
    const messageWrapper = container.querySelector('.message-wrapper');
    expect(messageWrapper).toHaveClass('message-wrapper', 'assistant', 'assistant-message');
    
    const messageBubble = container.querySelector('.message-bubble');
    expect(messageBubble).toHaveClass('message-bubble', 'assistant');
  });

  it('has proper accessibility attributes for assistant messages', () => {
    render(<AssistantMessage message={mockAssistantMessage} />);
    
    const messageWrapper = screen.getByRole('article');
    expect(messageWrapper).toHaveAttribute('aria-label', 'Assistant said: Hello from assistant');
  });

  it('displays timestamp with correct formatting', () => {
    render(<AssistantMessage message={mockAssistantMessage} />);
    
    const timeElement = screen.getByRole('time');
    expect(timeElement).toBeInTheDocument();
    expect(timeElement).toHaveAttribute('datetime', '2023-12-01T10:30:00.000Z');
    
    // Check that aria-label contains the expected format, accounting for timezone conversion
    const ariaLabel = timeElement.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/^Received at \d{1,2}:\d{2} (AM|PM)$/);
  });

  it('displays assistant-specific status messages', () => {
    const sendingMessage = { ...mockAssistantMessage, status: 'sending' as const };
    const { rerender } = render(<AssistantMessage message={sendingMessage} />);
    expect(screen.getByText('Processing...')).toBeInTheDocument();

    const sentMessage = { ...mockAssistantMessage, status: 'sent' as const };
    rerender(<AssistantMessage message={sentMessage} />);
    expect(screen.getByText('Delivered')).toBeInTheDocument();

    const errorMessage = { ...mockAssistantMessage, status: 'error' as const };
    rerender(<AssistantMessage message={errorMessage} />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('does not display status when not provided', () => {
    const messageWithoutStatus = { ...mockAssistantMessage, status: undefined };
    render(<AssistantMessage message={messageWithoutStatus} />);
    
    expect(screen.queryByText('Delivered')).not.toBeInTheDocument();
    expect(screen.queryByText('Processing...')).not.toBeInTheDocument();
    expect(screen.queryByText('Error')).not.toBeInTheDocument();
  });

  it('warns and falls back to base Message component for non-assistant messages', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const userMessage = { ...mockAssistantMessage, sender: 'user' as const };
    
    render(<AssistantMessage message={userMessage} />);
    
    expect(consoleSpy).toHaveBeenCalledWith('AssistantMessage component should only be used for assistant messages');
    consoleSpy.mockRestore();
  });

  it('handles different message statuses with proper aria labels', () => {
    const sendingMessage = { ...mockAssistantMessage, status: 'sending' as const };
    render(<AssistantMessage message={sendingMessage} />);
    
    expect(screen.getByLabelText('Message status: sending')).toBeInTheDocument();
  });

  it('renders message content in correct structure', () => {
    const { container } = render(<AssistantMessage message={mockAssistantMessage} />);
    
    const messageContent = container.querySelector('.message-content');
    expect(messageContent).toBeInTheDocument();
    expect(messageContent).toHaveTextContent('Hello from assistant');
    
    const messageMeta = container.querySelector('.message-meta');
    expect(messageMeta).toBeInTheDocument();
  });

  it('formats different timestamps correctly', () => {
    const morningMessage = { ...mockAssistantMessage, timestamp: new Date('2023-12-01T09:15:00Z') };
    const { rerender } = render(<AssistantMessage message={morningMessage} />);
    
    let timeElement = screen.getByRole('time');
    let ariaLabel = timeElement.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/^Received at \d{1,2}:\d{2} (AM|PM)$/);

    const eveningMessage = { ...mockAssistantMessage, timestamp: new Date('2023-12-01T20:45:00Z') };
    rerender(<AssistantMessage message={eveningMessage} />);
    
    timeElement = screen.getByRole('time');
    ariaLabel = timeElement.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/^Received at \d{1,2}:\d{2} (AM|PM)$/);
  });

  it('displays unique status text for assistant messages', () => {
    // Test that assistant messages have different status text than user messages
    const processingMessage = { ...mockAssistantMessage, status: 'sending' as const };
    render(<AssistantMessage message={processingMessage} />);
    
    // Assistant shows "Processing..." instead of "Sending..."
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(screen.queryByText('Sending...')).not.toBeInTheDocument();
    
    // Assistant shows "Delivered" instead of "Sent"
    const deliveredMessage = { ...mockAssistantMessage, status: 'sent' as const };
    render(<AssistantMessage message={deliveredMessage} />);
    
    expect(screen.getByText('Delivered')).toBeInTheDocument();
    expect(screen.queryByText('Sent')).not.toBeInTheDocument();
  });

  it('maintains proper semantic structure', () => {
    const { container } = render(<AssistantMessage message={mockAssistantMessage} />);
    
    // Check that the component maintains the expected DOM structure
    const article = container.querySelector('div[role="article"]');
    expect(article).toBeInTheDocument();
    
    const messageBubble = article?.querySelector('.message-bubble');
    expect(messageBubble).toBeInTheDocument();
    
    const messageContent = messageBubble?.querySelector('.message-content');
    const messageMeta = messageBubble?.querySelector('.message-meta');
    
    expect(messageContent).toBeInTheDocument();
    expect(messageMeta).toBeInTheDocument();
  });
});