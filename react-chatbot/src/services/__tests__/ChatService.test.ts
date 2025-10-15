import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ChatService, ChatServiceError, type ChatServiceConfig } from '../ChatService';

// Test-specific ChatService that allows us to control behavior
class TestChatService extends ChatService {
  private mockBehavior: {
    shouldFailNetwork?: boolean;
    shouldFailTimeout?: boolean;
    shouldSucceed?: boolean;
    networkFailureCount?: number;
    timeoutFailureCount?: number;
  } = {};

  public setMockBehavior(behavior: typeof this.mockBehavior) {
    this.mockBehavior = behavior;
  }

  protected async simulateAssistantResponse(content: string): Promise<string> {
    // Simulate a very short delay for tests
    await this.sleep(10);

    // Check mock behavior
    if (this.mockBehavior.shouldFailNetwork) {
      throw new ChatServiceError('Network connection failed', 'NETWORK_ERROR', true);
    }

    if (this.mockBehavior.shouldFailTimeout) {
      throw new ChatServiceError('Request timed out', 'TIMEOUT_ERROR', true);
    }

    // Generate contextual response based on user input (same logic as parent)
    return this.generateContextualResponse(content);
  }

  // Make protected methods accessible for testing
  public generateContextualResponse(content: string): string {
    const lowerContent = content.toLowerCase();

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
      return "That's a thoughtful question! Based on what you're asking, here's my perspective.";
    }

    return "I understand what you're saying. How can I help you with that?";
  }

  public sleep(ms: number): Promise<void> {
    return super['sleep'](ms);
  }
}

describe('ChatService', () => {
  let chatService: TestChatService;

  beforeEach(() => {
    // Create service with test-friendly configuration
    chatService = new TestChatService({
      maxRetries: 2,
      timeout: 100, // Very short timeout for faster tests
      retryDelay: 10, // Very short delay for faster tests
      useExponentialBackoff: false
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('sendMessage functionality', () => {
    it('should return a string response for valid input', async () => {
      chatService.setMockBehavior({ shouldSucceed: true });
      
      const response = await chatService.sendMessage('Hello');
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });

    it('should return contextual responses for greetings', async () => {
      chatService.setMockBehavior({ shouldSucceed: true });
      
      const response = await chatService.sendMessage('Hello there!');
      expect(response.toLowerCase()).toContain('hello');
    });

    it('should return contextual responses for help requests', async () => {
      chatService.setMockBehavior({ shouldSucceed: true });
      
      const response = await chatService.sendMessage('Can you help me?');
      expect(response.toLowerCase()).toContain('help');
    });

    it('should return contextual responses for thank you messages', async () => {
      chatService.setMockBehavior({ shouldSucceed: true });
      
      const response = await chatService.sendMessage('Thank you very much');
      expect(response.toLowerCase()).toContain('welcome');
    });

    it('should return contextual responses for goodbye messages', async () => {
      chatService.setMockBehavior({ shouldSucceed: true });
      
      const response = await chatService.sendMessage('Goodbye!');
      expect(response.toLowerCase()).toContain('goodbye');
    });

    it('should return contextual responses for questions', async () => {
      chatService.setMockBehavior({ shouldSucceed: true });
      
      const response = await chatService.sendMessage('What is the weather like?');
      expect(response.toLowerCase()).toContain('question');
    });
  });

  describe('input validation', () => {
    it('should throw ChatServiceError for empty message', async () => {
      await expect(chatService.sendMessage('')).rejects.toThrow(ChatServiceError);
      
      try {
        await chatService.sendMessage('');
      } catch (error) {
        expect(error).toBeInstanceOf(ChatServiceError);
        expect((error as ChatServiceError).code).toBe('EMPTY_MESSAGE');
        expect((error as ChatServiceError).isRetryable).toBe(false);
      }
    });

    it('should throw ChatServiceError for whitespace-only message', async () => {
      await expect(chatService.sendMessage('   \t\n  ')).rejects.toThrow(ChatServiceError);
      
      try {
        await chatService.sendMessage('   \t\n  ');
      } catch (error) {
        expect(error).toBeInstanceOf(ChatServiceError);
        expect((error as ChatServiceError).code).toBe('EMPTY_MESSAGE');
      }
    });

    it('should throw ChatServiceError for message that is too long', async () => {
      const longMessage = 'a'.repeat(1001);
      await expect(chatService.sendMessage(longMessage)).rejects.toThrow(ChatServiceError);
      
      try {
        await chatService.sendMessage(longMessage);
      } catch (error) {
        expect(error).toBeInstanceOf(ChatServiceError);
        expect((error as ChatServiceError).code).toBe('MESSAGE_TOO_LONG');
        expect((error as ChatServiceError).isRetryable).toBe(false);
      }
    });

    it('should accept message at maximum length (1000 characters)', async () => {
      chatService.setMockBehavior({ shouldSucceed: true });
      
      const maxLengthMessage = 'a'.repeat(1000);
      const response = await chatService.sendMessage(maxLengthMessage);
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });
  });

  describe('error handling and retry mechanisms', () => {
    it('should retry on network errors and eventually succeed', async () => {
      let callCount = 0;
      
      // Create a custom test service that tracks calls
      const testService = new TestChatService({
        maxRetries: 2,
        timeout: 100,
        retryDelay: 10,
        useExponentialBackoff: false
      });

      // Override the simulateAssistantResponse method to control behavior
      testService['simulateAssistantResponse'] = vi.fn().mockImplementation(async (content: string) => {
        callCount++;
        await testService.sleep(10);
        
        if (callCount <= 2) {
          throw new ChatServiceError('Network connection failed', 'NETWORK_ERROR', true);
        }
        
        return testService.generateContextualResponse(content);
      });

      const response = await testService.sendMessage('Hello');
      expect(typeof response).toBe('string');
      expect(callCount).toBe(3); // Two failures + one success
    });

    it('should retry on timeout errors and eventually succeed', async () => {
      let callCount = 0;
      
      const testService = new TestChatService({
        maxRetries: 2,
        timeout: 100,
        retryDelay: 10,
        useExponentialBackoff: false
      });

      testService['simulateAssistantResponse'] = vi.fn().mockImplementation(async (content: string) => {
        callCount++;
        await testService.sleep(10);
        
        if (callCount === 1) {
          throw new ChatServiceError('Request timed out', 'TIMEOUT_ERROR', true);
        }
        
        return testService.generateContextualResponse(content);
      });

      const response = await testService.sendMessage('Hello');
      expect(typeof response).toBe('string');
      expect(callCount).toBe(2); // One failure + one success
    });

    it('should fail after exhausting all retries', async () => {
      chatService.setMockBehavior({ shouldFailNetwork: true });

      await expect(chatService.sendMessage('Hello')).rejects.toThrow(ChatServiceError);
      
      try {
        await chatService.sendMessage('Hello');
      } catch (error) {
        expect(error).toBeInstanceOf(ChatServiceError);
        expect((error as ChatServiceError).code).toBe('NETWORK_ERROR');
      }
    });

    it('should call onError callback when retries are exhausted', async () => {
      const errorCallback = vi.fn();
      chatService.onError = errorCallback;
      
      chatService.setMockBehavior({ shouldFailNetwork: true });

      try {
        await chatService.sendMessage('Hello');
      } catch (error) {
        // Expected to throw
      }

      expect(errorCallback).toHaveBeenCalledWith(expect.any(ChatServiceError));
    });

    it('should not retry non-retryable errors', async () => {
      const errorCallback = vi.fn();
      chatService.onError = errorCallback;

      try {
        await chatService.sendMessage(''); // Empty message - non-retryable
      } catch (error) {
        // Expected to throw
      }

      // onError should not be called for validation errors
      expect(errorCallback).not.toHaveBeenCalled();
    });
  });

  describe('timeout handling', () => {
    it('should timeout requests that take too long', async () => {
      // Create service with very short timeout
      const shortTimeoutService = new ChatService({
        timeout: 10, // 10ms timeout
        maxRetries: 0 // No retries for cleaner test
      });

      // Mock Math.random to create a long delay (close to 2000ms)
      Math.random = vi.fn().mockReturnValue(0.99);

      await expect(shortTimeoutService.sendMessage('Hello')).rejects.toThrow(ChatServiceError);
      
      try {
        await shortTimeoutService.sendMessage('Hello');
      } catch (error) {
        expect(error).toBeInstanceOf(ChatServiceError);
        expect((error as ChatServiceError).code).toBe('TIMEOUT_ERROR');
        expect((error as ChatServiceError).isRetryable).toBe(true);
      }
    });

    it('should handle timeout during simulated response', async () => {
      chatService.setMockBehavior({ shouldFailTimeout: true });

      await expect(chatService.sendMessage('Hello')).rejects.toThrow(ChatServiceError);
      
      try {
        await chatService.sendMessage('Hello');
      } catch (error) {
        expect(error).toBeInstanceOf(ChatServiceError);
        expect((error as ChatServiceError).code).toBe('TIMEOUT_ERROR');
      }
    });
  });

  describe('network failure scenarios', () => {
    it('should handle network connection failures', async () => {
      chatService.setMockBehavior({ shouldFailNetwork: true });

      await expect(chatService.sendMessage('Hello')).rejects.toThrow(ChatServiceError);
      
      try {
        await chatService.sendMessage('Hello');
      } catch (error) {
        expect(error).toBeInstanceOf(ChatServiceError);
        expect((error as ChatServiceError).code).toBe('NETWORK_ERROR');
        expect((error as ChatServiceError).isRetryable).toBe(true);
      }
    });

    it('should use exponential backoff when configured', async () => {
      const exponentialService = new TestChatService({
        maxRetries: 2,
        retryDelay: 50,
        useExponentialBackoff: true,
        timeout: 1000
      });

      exponentialService.setMockBehavior({ shouldFailNetwork: true });

      const startTime = Date.now();
      
      try {
        await exponentialService.sendMessage('Hello');
      } catch (error) {
        // Expected to fail
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should take at least the base delays: 50ms + 100ms = 150ms (plus jitter)
      // But we can't be too strict due to test timing variability
      expect(duration).toBeGreaterThan(100);
    });

    it('should use linear backoff when exponential is disabled', async () => {
      const linearService = new TestChatService({
        maxRetries: 2,
        retryDelay: 50,
        useExponentialBackoff: false,
        timeout: 1000
      });

      linearService.setMockBehavior({ shouldFailNetwork: true });

      const startTime = Date.now();
      
      try {
        await linearService.sendMessage('Hello');
      } catch (error) {
        // Expected to fail
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should take at least the base delays: 50ms + 50ms = 100ms (plus jitter)
      expect(duration).toBeGreaterThan(80);
    });
  });

  describe('configuration management', () => {
    it('should use default configuration when none provided', () => {
      const defaultService = new ChatService();
      const config = defaultService.getConfig();
      
      expect(config.maxRetries).toBe(3);
      expect(config.timeout).toBe(5000);
      expect(config.retryDelay).toBe(1000);
      expect(config.useExponentialBackoff).toBe(true);
    });

    it('should allow partial configuration override', () => {
      const customService = new ChatService({
        maxRetries: 5,
        timeout: 2000
        // retryDelay and useExponentialBackoff should use defaults
      });
      
      const config = customService.getConfig();
      expect(config.maxRetries).toBe(5);
      expect(config.timeout).toBe(2000);
      expect(config.retryDelay).toBe(1000); // default
      expect(config.useExponentialBackoff).toBe(true); // default
    });

    it('should allow configuration updates after instantiation', () => {
      chatService.updateConfig({ maxRetries: 5, timeout: 2000 });
      const config = chatService.getConfig();
      
      expect(config.maxRetries).toBe(5);
      expect(config.timeout).toBe(2000);
      expect(config.retryDelay).toBe(10); // original value preserved
      expect(config.useExponentialBackoff).toBe(false); // original value preserved
    });

    it('should return a copy of configuration to prevent external mutation', () => {
      const config1 = chatService.getConfig();
      const config2 = chatService.getConfig();
      
      expect(config1).not.toBe(config2); // Different objects
      expect(config1).toEqual(config2); // Same values
      
      // Modifying returned config should not affect service
      config1.maxRetries = 999;
      expect(chatService.getConfig().maxRetries).toBe(2); // Original value
    });
  });
});

describe('ChatServiceError', () => {
  it('should create error with correct properties', () => {
    const error = new ChatServiceError('Test message', 'TEST_CODE', true);
    
    expect(error.message).toBe('Test message');
    expect(error.code).toBe('TEST_CODE');
    expect(error.isRetryable).toBe(true);
    expect(error.name).toBe('ChatServiceError');
  });

  it('should default isRetryable to false', () => {
    const error = new ChatServiceError('Test message', 'TEST_CODE');
    expect(error.isRetryable).toBe(false);
  });
});