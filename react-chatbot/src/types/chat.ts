// Chat-specific type definitions

/**
 * Represents a single message in the chat conversation
 */
export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  validationStatus?: string;
  initialResponse?: string;
  corruptedResponse?: string;
  extractedLogicalStmt?: string;
  originalResult?: string;
  negatedResult?: string;
  durations?: Record<string, number>;
}

/**
 * Represents the overall state of the chat application
 */
export interface ChatState {
  messages: Message[];
  isTyping: boolean;
  error?: string;
  isStreaming?: boolean;
  streamingMessage?: string;
  doCorrupt?: boolean;
}

/**
 * Interface for the chat service that handles assistant responses
 */
export interface ChatService {
  sendMessage(content: string): Promise<string>;
  onError?: (error: Error) => void;
}