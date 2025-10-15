import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FactsService, FactsServiceError } from '../FactsService';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('FactsService', () => {
  let factsService: FactsService;

  beforeEach(() => {
    factsService = new FactsService('http://localhost:8000');
    vi.clearAllMocks();
  });

  afterEach(() => {
    factsService.cancelRequest();
  });

  describe('getFacts', () => {
    it('should successfully fetch facts from the API', async () => {
      const mockFacts = [
        'Patient name: John Doe',
        'Patient age: 45 years old',
        'Heart rate: 72 bpm'
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          facts: mockFacts,
          timestamp: '2024-01-15T10:30:00Z'
        })
      });

      const result = await factsService.getFacts();

      expect(result).toEqual(mockFacts);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/facts',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        })
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(factsService.getFacts()).rejects.toThrow(FactsServiceError);
      await expect(factsService.getFacts()).rejects.toThrow('Network connection failed');
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'INTERNAL_ERROR',
          message: 'Server error'
        })
      });

      try {
        await factsService.getFacts();
      } catch (error) {
        expect(error).toBeInstanceOf(FactsServiceError);
        expect((error as FactsServiceError).message).toBe('Server error');
      }
    });

    it('should handle service unavailable errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({
          error: 'SERVICE_UNAVAILABLE',
          message: 'Service temporarily unavailable'
        })
      });

      try {
        await factsService.getFacts();
      } catch (error) {
        expect(error).toBeInstanceOf(FactsServiceError);
        expect((error as FactsServiceError).code).toBe('SERVICE_UNAVAILABLE');
        expect((error as FactsServiceError).isRetryable).toBe(true);
      }
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 408,
        json: async () => ({
          error: 'TIMEOUT_ERROR',
          message: 'Request timed out'
        })
      });

      try {
        await factsService.getFacts();
      } catch (error) {
        expect(error).toBeInstanceOf(FactsServiceError);
        expect((error as FactsServiceError).code).toBe('TIMEOUT_ERROR');
        expect((error as FactsServiceError).isRetryable).toBe(true);
      }
    });

    it('should cancel ongoing requests', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      
      mockFetch.mockRejectedValueOnce(abortError);

      const promise = factsService.getFacts();
      factsService.cancelRequest();

      await expect(promise).rejects.toThrow(FactsServiceError);
      await expect(promise).rejects.toThrow('Request was cancelled');
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      await expect(factsService.getFacts()).rejects.toThrow(FactsServiceError);
    });
  });

  describe('cancelRequest', () => {
    it('should cancel ongoing requests without throwing', () => {
      expect(() => factsService.cancelRequest()).not.toThrow();
    });
  });
});