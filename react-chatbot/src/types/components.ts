// Component prop interfaces

import type { Message } from './chat';

/**
 * Props for the MessageList component
 */
export interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  onRetry?: (messageId: string) => void;
}

/**
 * Props for the Message component
 */
export interface MessageProps {
  message: Message;
  messageIndex?: number;
  totalMessages?: number;
  onRetry?: (messageId: string) => void;
}

/**
 * Props for the MessageInput component
 */
export interface MessageInputProps {
  onSendMessage: (content: string, doCorrupt?: boolean) => void;
  disabled?: boolean;
  corruptResponses?: boolean;
  onCorruptResponsesChange?: (enabled: boolean) => void;
}

/**
 * Props for the TypingIndicator component
 */
export interface TypingIndicatorProps {
  /** Whether the typing indicator should be visible */
  isVisible: boolean;
  /** Optional className for additional styling */
  className?: string;
}

/**
 * Props for the MainLayout component
 */
export interface MainLayoutProps {
  children: React.ReactNode;
  initialChatWidth?: number;
  minChatWidth?: number;
  minTheoryWidth?: number;
}

/**
 * Props for the TheorySection component
 */
export interface TheorySectionProps {
  content?: string;
  className?: string;
}

/**
 * Props for the ResizableSeparator component
 */
export interface ResizableSeparatorProps {
  onResize: (newChatWidth: number) => void;
  minChatWidth: number;
  minTheoryWidth: number;
}