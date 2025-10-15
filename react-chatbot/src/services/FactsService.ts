/**
 * Service for fetching theorem prover facts from the backend
 */

export interface FactsResponse {
  facts: string[];
  timestamp: string;
}

export interface AxiomsResponse {
  axioms: string[];
  timestamp: string;
}

export class FactsServiceError extends Error {
  public code: string;
  public isRetryable: boolean;

  constructor(
    message: string,
    code: string,
    isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'FactsServiceError';
    this.code = code;
    this.isRetryable = isRetryable;
  }
}

export class FactsService {
  private baseUrl: string;
  private factsAbortController: AbortController | null = null;
  private axiomsAbortController: AbortController | null = null;
  
  // Cache for facts and axioms
  private cachedFacts: string[] | null = null;
  private cachedAxioms: string[] | null = null;
  private factsPromise: Promise<string[]> | null = null;
  private axiomsPromise: Promise<string[]> | null = null;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch theorem prover facts from the backend (with caching)
   */
  async getFacts(): Promise<string[]> {
    // Return cached facts if available
    if (this.cachedFacts !== null) {
      console.log('📦 Returning cached facts');
      return this.cachedFacts;
    }

    // If there's already a request in progress, return that promise
    if (this.factsPromise !== null) {
      console.log('⏳ Facts request already in progress, waiting...');
      return this.factsPromise;
    }

    // Start a new request and cache the promise
    this.factsPromise = this.fetchFactsFromBackend();
    
    try {
      const facts = await this.factsPromise;
      this.cachedFacts = facts;
      console.log('✅ Facts cached successfully');
      return facts;
    } catch (error) {
      // Clear the promise on error so we can retry
      this.factsPromise = null;
      throw error;
    }
  }

  /**
   * Internal method to fetch facts from the backend
   */
  private async fetchFactsFromBackend(): Promise<string[]> {
    // Cancel any existing facts request
    if (this.factsAbortController) {
      this.factsAbortController.abort();
    }

    this.factsAbortController = new AbortController();

    try {
      console.log(`🌐 Making request to: ${this.baseUrl}/api/facts`);
      const response = await fetch(`${this.baseUrl}/api/facts`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: this.factsAbortController.signal,
      });
      
      console.log(`📡 Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 503) {
          throw new FactsServiceError(
            errorData.message || 'Service temporarily unavailable',
            'SERVICE_UNAVAILABLE',
            true
          );
        }
        
        if (response.status === 408) {
          throw new FactsServiceError(
            errorData.message || 'Request timed out',
            'TIMEOUT_ERROR',
            true
          );
        }

        throw new FactsServiceError(
          errorData.message || 'Failed to fetch facts',
          'FETCH_ERROR',
          response.status >= 500
        );
      }

      const data: FactsResponse = await response.json();
      console.log(`✅ Successfully parsed JSON response:`, data);
      return data.facts;

    } catch (error) {
      console.error('🚨 Raw error in fetchFactsFromBackend:', error);
      
      if (error instanceof FactsServiceError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new FactsServiceError(
          'Request was cancelled',
          'CANCELLED',
          false
        );
      }

      if (error instanceof TypeError) {
        throw new FactsServiceError(
          'Network connection failed',
          'NETWORK_ERROR',
          true
        );
      }

      throw new FactsServiceError(
        'An unexpected error occurred while fetching facts',
        'UNKNOWN_ERROR',
        true
      );
    } finally {
      this.factsAbortController = null;
    }
  }

  /**
   * Fetch theorem prover axioms from the backend (with caching)
   */
  async getAxioms(): Promise<string[]> {
    // Return cached axioms if available
    if (this.cachedAxioms !== null) {
      console.log('📦 Returning cached axioms');
      return this.cachedAxioms;
    }

    // If there's already a request in progress, return that promise
    if (this.axiomsPromise !== null) {
      console.log('⏳ Axioms request already in progress, waiting...');
      return this.axiomsPromise;
    }

    // Start a new request and cache the promise
    this.axiomsPromise = this.fetchAxiomsFromBackend();
    
    try {
      const axioms = await this.axiomsPromise;
      this.cachedAxioms = axioms;
      console.log('✅ Axioms cached successfully');
      return axioms;
    } catch (error) {
      // Clear the promise on error so we can retry
      this.axiomsPromise = null;
      throw error;
    }
  }

  /**
   * Internal method to fetch axioms from the backend
   */
  private async fetchAxiomsFromBackend(): Promise<string[]> {
    // Cancel any existing axioms request
    if (this.axiomsAbortController) {
      this.axiomsAbortController.abort();
    }

    this.axiomsAbortController = new AbortController();

    try {
      console.log(`🌐 Making request to: ${this.baseUrl}/api/axioms`);
      const response = await fetch(`${this.baseUrl}/api/axioms`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: this.axiomsAbortController.signal,
      });

      console.log(`📡 Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 503) {
          throw new FactsServiceError(
            errorData.message || 'Service temporarily unavailable',
            'SERVICE_UNAVAILABLE',
            true
          );
        }
        
        if (response.status === 408) {
          throw new FactsServiceError(
            errorData.message || 'Request timed out',
            'TIMEOUT_ERROR',
            true
          );
        }

        throw new FactsServiceError(
          errorData.message || 'Failed to fetch axioms',
          'FETCH_ERROR',
          response.status >= 500
        );
      }

      const data: AxiomsResponse = await response.json();
      console.log(`✅ Successfully parsed axioms response:`, data);
      return data.axioms;

    } catch (error) {
      console.error('🚨 Raw error in fetchAxiomsFromBackend:', error);
      
      if (error instanceof FactsServiceError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new FactsServiceError(
          'Request was cancelled',
          'CANCELLED',
          false
        );
      }

      if (error instanceof TypeError) {
        throw new FactsServiceError(
          'Network connection failed',
          'NETWORK_ERROR',
          true
        );
      }

      throw new FactsServiceError(
        'An unexpected error occurred while fetching axioms',
        'UNKNOWN_ERROR',
        true
      );
    } finally {
      this.axiomsAbortController = null;
    }
  }

  /**
   * Cancel any ongoing requests
   */
  cancelRequest(): void {
    if (this.factsAbortController) {
      this.factsAbortController.abort();
      this.factsAbortController = null;
    }
    if (this.axiomsAbortController) {
      this.axiomsAbortController.abort();
      this.axiomsAbortController = null;
    }
  }

  /**
   * Clear cached data (useful for testing or if data needs to be refreshed)
   */
  clearCache(): void {
    console.log('🗑️ Clearing facts and axioms cache');
    this.cachedFacts = null;
    this.cachedAxioms = null;
    this.factsPromise = null;
    this.axiomsPromise = null;
  }

  /**
   * Check if facts are cached
   */
  areFactsCached(): boolean {
    return this.cachedFacts !== null;
  }

  /**
   * Check if axioms are cached
   */
  areAxiomsCached(): boolean {
    return this.cachedAxioms !== null;
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { facts: boolean; axioms: boolean } {
    return {
      facts: this.areFactsCached(),
      axioms: this.areAxiomsCached()
    };
  }
}

// Export a singleton instance
export const factsService = new FactsService();