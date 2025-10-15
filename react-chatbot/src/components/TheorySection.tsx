import React, { useState, useEffect, useCallback } from 'react';
import type { TheorySectionProps } from '../types/components';
import { factsService, FactsServiceError } from '../services/FactsService';
import '../styles/TheorySection.css';

type ViewMode = 'facts' | 'axioms';

/**
 * TheorySection component for displaying theorem prover facts and axioms
 * Shows a toggle button to switch between facts and axioms view
 */
export const TheorySection: React.FC<TheorySectionProps> = ({
  content,
  className = ''
}) => {
  const [facts, setFacts] = useState<string[]>([]);
  const [axioms, setAxioms] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('facts');
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Debug: Log when facts state changes
  useEffect(() => {
    console.log('Facts state changed to:', facts.length, 'items');
  }, [facts]);

  // Debug: Log when axioms state changes
  useEffect(() => {
    console.log('Axioms state changed to:', axioms.length, 'items');
  }, [axioms]);

  // Fetch facts from the backend
  const fetchFacts = useCallback(async () => {
    try {
      console.log('Fetching facts from backend...');
      const fetchedFacts = await factsService.getFacts();
      console.log('Received facts:', fetchedFacts.length, 'items:', fetchedFacts.slice(0, 2));
      console.log('About to call setFacts with:', fetchedFacts);
      setFacts(fetchedFacts);
      console.log('setFacts called successfully');
    } catch (err) {
      console.error('❌ Error fetching facts:', err);
      console.error('Error details:', err instanceof Error ? err.message : 'Unknown error');
      console.error('Error type:', typeof err);
      if (err instanceof Error) {
        console.error('Error name:', err.name);
        console.error('Error stack:', err.stack);
      }
      if (err instanceof FactsServiceError) {
        console.error('FactsServiceError code:', err.code);
        console.error('FactsServiceError isRetryable:', err.isRetryable);
      }
      // On error, just show empty facts - keep it simple
      setFacts([]);
    }
  }, []);

  // Fetch axioms from the backend
  const fetchAxioms = useCallback(async () => {
    try {
      console.log('Fetching axioms from backend...');
      const fetchedAxioms = await factsService.getAxioms();
      console.log('Received axioms:', fetchedAxioms.length, 'items:', fetchedAxioms.slice(0, 2));
      console.log('About to call setAxioms with:', fetchedAxioms);
      setAxioms(fetchedAxioms);
      console.log('setAxioms called successfully');
    } catch (err) {
      console.error('Error fetching axioms:', err);
      console.error('Error details:', err instanceof Error ? err.message : 'Unknown error');
      // On error, just show empty axioms - keep it simple
      setAxioms([]);
    }
  }, []);

  // Fetch both facts and axioms
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([fetchFacts(), fetchAxioms()]);
    } finally {
      setLoading(false);
    }
  }, [fetchFacts, fetchAxioms]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    // Test basic connectivity first
    console.log('🔍 Testing backend connectivity...');
    
    // Use environment-aware URL for health check
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? process.env.REACT_APP_API_URL || 'https://localhost:8000'  // Production HTTPS
      : 'http://localhost:8000';  // Local development
      
    fetch(`${baseUrl}/health`)
      .then(response => {
        console.log('🏥 Health check response:', response.status, response.statusText);
        return response.json();
      })
      .then(data => {
        console.log('🏥 Health check data:', data);
        // Now fetch the actual data
        fetchData();
      })
      .catch(error => {
        console.error('🚨 Health check failed:', error);
        // Still try to fetch data in case it's just a health endpoint issue
        fetchData();
      });

    // Set up periodic refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);

    return () => {
      clearInterval(interval);
      factsService.cancelRequest();
    };
  }, [fetchData]);

  // Toggle between facts and axioms with fade transition
  const handleToggleView = () => {
    setIsTransitioning(true);

    // Start fade out, then switch content, then fade in
    setTimeout(() => {
      setViewMode(prev => prev === 'facts' ? 'axioms' : 'facts');
      setIsTransitioning(false);
    }, 600); // Half of the transition duration
  };

  // Determine what to display based on current view mode
  let displayItems: string[] = [];
  let currentTitle = '';

  console.log('TheorySection render - content:', content, 'loading:', loading, 'facts:', facts.length, 'axioms:', axioms.length, 'viewMode:', viewMode);

  if (content) {
    // If content is provided, split it by lines but don't filter - show exactly as provided
    displayItems = content.split('\n');
    currentTitle = 'Logical context';
  } else if (loading) {
    displayItems = ['Loading...'];
    currentTitle = 'Logical context';
  } else {
    if (viewMode === 'facts') {
      displayItems = facts.length === 0 ? ['No facts available.'] : facts;
      currentTitle = 'Facts (derived from the FHIR records)';
    } else {
      displayItems = axioms.length === 0 ? ['No axioms available.'] : axioms;
      currentTitle = 'Theory (derived from the facts)';
    }
  }

  return (
    <section
      className={`theory-section ${className}`}
      role="complementary"
      aria-label="Logical context"
      tabIndex={0}
    >
      <header className="theory-section__header">
        <div className="theory-section__header-content">
          <h2 className="theory-section__title" id="theory-section-title">
            {currentTitle}
          </h2>
          {!content && (
            <button
              className="theory-section__toggle-icon"
              onClick={handleToggleView}
              aria-label={`Switch to ${viewMode === 'facts' ? 'axioms' : 'facts'} view`}
              disabled={loading}
              title={`Switch to ${viewMode === 'facts' ? 'axioms' : 'facts'} view`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 133.04 130.89"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="theory-section__toggle-svg"
              >
                <g transform="translate(-9.1321 -4.2794)">
                  {/* Top-right arrow */}
                  <path
                    d="m127.39 49.589-26.068 14.463 12.401 24.162h-18.56v-13.451l-18.011 28.463 18.011 30.065v-13.704l19.656-0.0422 1.9403-0.54818 1.5185-0.96985 1.0123-1.1385 19.698-31.077 0.88579-2.9096 0.42181-2.8674v-2.9096l-0.33744-2.3614-12.57-25.174z"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="1"
                  />

                  {/* Bottom-left arrow */}
                  <path
                    d="m68.923 119.38-0.168-29.774-27.123-0.844 8.943-16.234 11.726 6.452-16.282-29.433l-35.01 1.3072 12.022 6.536-9.4907 17.289-0.42181 1.6445v1.6024l0.50617 1.771 17.885 32.427 2.4043 2.3192 2.6574 1.8975 2.9105 1.4759 1.2232 0.42168 28.219 1.1385z"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="1"
                  />

                  {/* Top-left arrow */}
                  <path
                    d="m38.933 34.156 25.477 15.475 14.89-22.644 9.1532 16.066-11.684 6.6625 33.66 1.5602 17.252-30.487-11.937 6.789-9.7016-17.078-1.5185-1.4337-1.6029-0.84335-1.4342-0.33734-36.866-1.7289-3.5432 0.88552-3.2901 1.4759-3.1214 2.1505-15.733 23.487z"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                </g>
              </svg>
            </button>
          )}
        </div>
      </header>

      <div className="theory-section__content">
        <div
          className="theory-section__scrollable"
          role="region"
          aria-labelledby="theory-section-title"
          aria-describedby="theory-section-instructions"
          tabIndex={0}
        >
          <div className={`theory-section__text ${isTransitioning ? 'theory-section__text--transitioning' : ''}`}>
            {displayItems.map((item, index) => (
              <div key={`${viewMode}-${index}`} className={`theory-section__item theory-section__${viewMode === 'facts' ? 'fact' : 'axiom'}`}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Instructions for screen readers */}
      <div id="theory-section-instructions" className="sr-only">
        Scrollable content area with logical {viewMode}. Use arrow keys to scroll. Use the toggle button to switch between facts and axioms.
      </div>
    </section>
  );
};

export default TheorySection;