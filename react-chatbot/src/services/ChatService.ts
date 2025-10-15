import type { ChatService as IChatService } from '../types/chat';

/**
 * Configuration options for the ChatService
 */
export interface ChatServiceConfig {
  /** Maximum number of retry attempts for failed requests */
  maxRetries?: number;
  /** Timeout in milliseconds for each request */
  timeout?: number;
  /** Base delay in milliseconds between retry attempts */
  retryDelay?: number;
  /** Whether to use exponential backoff for retries */
  useExponentialBackoff?: boolean;
  /** Backend API URL (if not provided, uses mock responses) */
  apiUrl?: string;
  /** Whether to use mock responses instead of real API */
  useMockResponses?: boolean;
}

/**
 * Custom error class for chat service errors
 */
export class ChatServiceError extends Error {
  public readonly code: string;
  public readonly isRetryable: boolean;

  constructor(
    message: string,
    code: string,
    isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'ChatServiceError';
    this.code = code;
    this.isRetryable = isRetryable;
  }
}

/**
 * Base Event interface
 */
export interface BaseEvent {
  timestamp: string;
  is_final: boolean;
}

/**
 * ProgressUpdate event for displaying progress messages in UX
 */
export interface ProgressUpdate extends BaseEvent {
  type: 'progress';
  message: string;
}

/**
 * FinalSummary event that summarizes the computation
 */
export interface FinalSummary extends BaseEvent {
  type: 'final';
  assistant_response?: string;
  corrupted_response?: string;
  extracted_logical_stmt?: string;
  durations?: Record<string, number>;
  valid?: string;
  original_result?: string;
  negated_result?: string;
  error_messages?: string[];
  progress_messages?: string[];
}

/**
 * Union type for all streaming events
 */
export type StreamingUpdate = ProgressUpdate | FinalSummary;

/**
 * Mock responses for development and testing
 */
const MOCK_RESPONSES = [
  "Hello! How can I help you today?",
  "That's an interesting question. Let me think about that...",
  "I understand what you're asking. Here's my perspective on that topic.",
  "Thanks for sharing that with me. I'd be happy to help you with this.",
  "That's a great point! Let me provide some additional information.",
  "I see what you mean. Here's another way to look at it.",
  "Absolutely! I can definitely help you with that.",
  "That's a complex topic. Let me break it down for you.",
  "I appreciate you bringing this up. Here's what I think about it.",
  "Good question! This is something many people wonder about."
];

/**
 * ChatService implementation for handling assistant responses
 * Provides mock responses for development and testing with proper error handling and retry logic
 */
export class ChatService implements IChatService {
  private config: Required<ChatServiceConfig>;
  public onError?: (error: Error) => void;

  constructor(config: ChatServiceConfig = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      timeout: config.timeout ?? 5000,
      retryDelay: config.retryDelay ?? 1000,
      useExponentialBackoff: config.useExponentialBackoff ?? true,
      apiUrl: config.apiUrl ?? 'http://localhost:8000',
      useMockResponses: config.useMockResponses ?? false,
    };
  }

  /**
   * Sends a message and returns the assistant's response
   * @param content The message content to send
   * @returns Promise that resolves to the assistant's response
   * @throws ChatServiceError for various error conditions
   */
  async sendMessage(content: string): Promise<string> {
    if (!content || content.trim().length === 0) {
      throw new ChatServiceError(
        'Message content cannot be empty',
        'EMPTY_MESSAGE',
        false
      );
    }

    if (content.length > 1000) {
      throw new ChatServiceError(
        'Message content is too long (maximum 1000 characters)',
        'MESSAGE_TOO_LONG',
        false
      );
    }

    return this.executeWithRetry(() => this.simulateAssistantResponse(content));
  }

  /**
   * Sends a message and streams the assistant's response progressively
   * @param content The message content to send
   * @param onUpdate Callback function called for each streaming update
   * @returns Promise that resolves when streaming is complete
   * @throws ChatServiceError for various error conditions
   */
  async sendMessageStream(
    content: string,
    onUpdate: (update: StreamingUpdate) => void
  ): Promise<void> {
    if (!content || content.trim().length === 0) {
      throw new ChatServiceError(
        'Message content cannot be empty',
        'EMPTY_MESSAGE',
        false
      );
    }

    if (content.length > 1000) {
      throw new ChatServiceError(
        'Message content is too long (maximum 1000 characters)',
        'MESSAGE_TOO_LONG',
        false
      );
    }

    if (this.config.useMockResponses) {
      return this.simulateStreamingResponse(content, onUpdate);
    } else {
      return this.getStreamingApiResponse(content, onUpdate);
    }
  }

  /**
   * Gets assistant response - either from real API or mock responses
   * @param content The user's message content
   * @returns Promise that resolves to the assistant's response
   */
  protected async simulateAssistantResponse(content: string): Promise<string> {
    if (this.config.useMockResponses) {
      return this.getMockResponse(content);
    } else {
      return this.getApiResponse(content);
    }
  }

  /**
   * Gets streaming response from the backend API
   * @param content The user's message content
   * @param onUpdate Callback for each streaming update
   * @returns Promise that resolves when streaming is complete
   */
  private async getStreamingApiResponse(
    content: string,
    onUpdate: (update: StreamingUpdate) => void
  ): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout * 3); // Longer timeout for streaming

    try {
      const response = await fetch(`${this.config.apiUrl}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ message: content }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 408) {
          throw new ChatServiceError(errorData.message || 'Request timed out', 'TIMEOUT_ERROR', true);
        } else if (response.status === 503) {
          throw new ChatServiceError(errorData.message || 'Service unavailable', 'NETWORK_ERROR', true);
        } else if (response.status >= 400 && response.status < 500) {
          throw new ChatServiceError(errorData.message || 'Invalid request', 'VALIDATION_ERROR', false);
        } else {
          throw new ChatServiceError(errorData.message || 'Server error', 'NETWORK_ERROR', true);
        }
      }

      if (!response.body) {
        throw new ChatServiceError('No response body received', 'NETWORK_ERROR', true);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonData = line.slice(6); // Remove 'data: ' prefix
                if (jsonData.trim()) {
                  const update: StreamingUpdate = JSON.parse(jsonData);
                  onUpdate(update);
                  
                  if (update.is_final) {
                    return;
                  }
                }
              } catch (parseError) {
                console.warn('Failed to parse streaming data:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof ChatServiceError) {
        throw error;
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ChatServiceError('Request timed out', 'TIMEOUT_ERROR', true);
      }
      
      throw new ChatServiceError('Network connection failed', 'NETWORK_ERROR', true);
    }
  }

  /**
   * Gets response from the backend API
   * @param content The user's message content
   * @returns Promise that resolves to the assistant's response
   */
  private async getApiResponse(content: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.apiUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Map HTTP status codes to our error types
        if (response.status === 408) {
          throw new ChatServiceError(errorData.message || 'Request timed out', 'TIMEOUT_ERROR', true);
        } else if (response.status === 503) {
          throw new ChatServiceError(errorData.message || 'Service unavailable', 'NETWORK_ERROR', true);
        } else if (response.status >= 400 && response.status < 500) {
          throw new ChatServiceError(errorData.message || 'Invalid request', 'VALIDATION_ERROR', false);
        } else {
          throw new ChatServiceError(errorData.message || 'Server error', 'NETWORK_ERROR', true);
        }
      }

      const data = await response.json();
      return data.message;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof ChatServiceError) {
        throw error;
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ChatServiceError('Request timed out', 'TIMEOUT_ERROR', true);
      }
      
      // Network or other fetch errors
      throw new ChatServiceError('Network connection failed', 'NETWORK_ERROR', true);
    }
  }

  /**
   * Simulates streaming response with progressive updates
   * @param content The user's message content
   * @param onUpdate Callback for each streaming update
   * @returns Promise that resolves when streaming is complete
   */
  private async simulateStreamingResponse(
    content: string,
    onUpdate: (update: StreamingUpdate) => void
  ): Promise<void> {
    const baseTimestamp = new Date().toISOString();
    
    // Step 1: Initial response
    await this.sleep(800);
    onUpdate({
      assistant_response: this.generateContextualResponse(content),
      timestamp: baseTimestamp,
      is_final: false,
    });

    // Step 2: Logical extraction (simulate)
    await this.sleep(1200);
    onUpdate({
      extracted_logical_stmt: `(mock-extraction "${content.slice(0, 20)}...")`,
      timestamp: new Date().toISOString(),
      is_final: false,
    });

    // Step 3: Validation results
    await this.sleep(900);
    onUpdate({
      valid: Math.random() > 0.5 ? 'true' : 'false',
      durations: {
        'LLM': 0.8,
        'Extraction': 1.2,
        'theorem prover': 0.9,
      },
      timestamp: new Date().toISOString(),
      is_final: true,
    });
  }

  /**
   * Gets mock response with simulated delays and failures
   * @param content The user's message content
   * @returns Promise that resolves to a mock response
   */
  private async getMockResponse(content: string): Promise<string> {
    // Simulate network delay (500ms to 2000ms)
    const delay = Math.random() * 1500 + 500;
    await this.sleep(delay);

    // Simulate occasional network failures (10% chance)
    if (Math.random() < 0.1) {
      throw new ChatServiceError(
        'Network connection failed',
        'NETWORK_ERROR',
        true
      );
    }

    // Simulate timeout errors (5% chance)
    if (Math.random() < 0.05) {
      throw new ChatServiceError(
        'Request timed out',
        'TIMEOUT_ERROR',
        true
      );
    }

    // Generate contextual response based on user input
    return this.generateContextualResponse(content);
  }

  /**
   * Generates a contextual response based on the user's message
   * @param content The user's message content
   * @returns A relevant mock response
   */
  protected generateContextualResponse(content: string): string {
    const lowerContent = content.toLowerCase();

    // Simple keyword-based responses for more realistic interaction
    if (lowerContent.includes('hello') || lowerContent.includes('hi')) {
      return "Hello! It's great to meet you. How can I assist you today?";
    }

    if (lowerContent.includes('help')) {
      return "I'm here to help! What specific question or topic would you like assistance with?";
    }

    if (lowerContent.includes('thank')) {
      return "You're very welcome! I'm glad I could help. Is there anything else you'd like to know?";
    }

    if (lowerContent.includes('bye') || lowerContent.includes('goodbye')) {
      return "Goodbye! It was nice chatting with you. Feel free to come back anytime if you have more questions.";
    }

    if (lowerContent.includes('?')) {
      return "That's a thoughtful question! Based on what you're asking, here's my perspective: " + 
             MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
    }

    // Default to random response
    return MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
  }

  /**
   * Executes a function with retry logic for handling transient failures
   * @param fn The function to execute
   * @returns Promise that resolves to the function's result
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new ChatServiceError(
              `Request timed out after ${this.config.timeout}ms`,
              'TIMEOUT_ERROR',
              true
            ));
          }, this.config.timeout);
        });

        // Race between the actual request and timeout
        return await Promise.race([fn(), timeoutPromise]);
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry if it's not a retryable error or if we've exhausted retries
        if (!(error instanceof ChatServiceError) || 
            !error.isRetryable || 
            attempt === this.config.maxRetries) {
          break;
        }

        // Calculate delay for next retry
        const delay = this.config.useExponentialBackoff
          ? this.config.retryDelay * Math.pow(2, attempt)
          : this.config.retryDelay;

        // Add some jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * 1000;
        
        console.warn(`ChatService: Attempt ${attempt + 1} failed, retrying in ${jitteredDelay}ms...`, error);
        await this.sleep(jitteredDelay);
      }
    }

    // If we get here, all retries failed
    const finalError = lastError instanceof ChatServiceError 
      ? lastError 
      : new ChatServiceError(
          `Failed after ${this.config.maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`,
          'MAX_RETRIES_EXCEEDED',
          false
        );

    // Call error handler if provided
    if (this.onError) {
      this.onError(finalError);
    }

    throw finalError;
  }

  /**
   * Utility function to create a delay
   * @param ms Milliseconds to sleep
   * @returns Promise that resolves after the specified delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Updates the service configuration
   * @param config New configuration options
   */
  public updateConfig(config: Partial<ChatServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets the current service configuration
   * @returns Current configuration
   */
  public getConfig(): ChatServiceConfig {
    return { ...this.config };
  }
}

/**
 * Default ChatService instance for use throughout the application
 * Configure to use real backend API by default, but use mocks during testing
 */
export const chatService = new ChatService({
  apiUrl: 'http://localhost:8000',
  useMockResponses: typeof process !== 'undefined' && process.env.NODE_ENV === 'test', // Use mocks during testing
});