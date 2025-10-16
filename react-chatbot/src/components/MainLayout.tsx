import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { MainLayoutProps } from '../types/components';
import { ResizableSeparator } from './ResizableSeparator';
import { TheorySection } from './TheorySection';
import '../styles/MainLayout.css';

/**
 * MainLayout component that manages the dual-pane structure with resizable functionality
 * Provides responsive behavior for different screen sizes and layout persistence
 */
export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  initialChatWidth = 70, // Default to 70% for chat pane
  minChatWidth = 300,
  minTheoryWidth = 250
}) => {
  // Layout state management
  const [chatWidthPercent, setChatWidthPercent] = useState<number>(initialChatWidth);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isTablet, setIsTablet] = useState<boolean>(false);
  
  // Debug: Log when chat width changes
  useEffect(() => {
    console.log('💬 Chat width changed to:', chatWidthPercent, '% (Theory width:', 100 - chatWidthPercent, '%)');
  }, [chatWidthPercent]);
  
  // Refs for accessibility
  const layoutAnnouncementRef = useRef<HTMLDivElement>(null);
  const mainLayoutRef = useRef<HTMLDivElement>(null);

  // Load saved layout preferences from localStorage
  useEffect(() => {
    try {
      const savedWidth = localStorage.getItem('chatbot-chat-width');
      if (savedWidth) {
        const width = parseFloat(savedWidth);
        if (width >= 30 && width <= 80) { // Reasonable bounds
          setChatWidthPercent(width);
        }
      }
    } catch (error) {
      // Gracefully handle localStorage errors
      console.warn('Failed to load layout preferences:', error);
    }
  }, []);

  // Save layout preferences to localStorage
  const saveLayoutPreference = useCallback((width: number) => {
    try {
      localStorage.setItem('chatbot-chat-width', width.toString());
    } catch (error) {
      // Gracefully handle localStorage errors
      console.warn('Failed to save layout preferences:', error);
    }
  }, []);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const newIsMobile = width < 768;
      const newIsTablet = width >= 768 && width < 1024;
      
      console.log('📱 Window resize detected:', width, 'px. Mobile:', newIsMobile, 'Tablet:', newIsTablet);
      
      setIsMobile(newIsMobile);
      setIsTablet(newIsTablet);

      // Adjust layout for tablet view
      if (newIsTablet && !isMobile) {
        console.log('📱 Switching to tablet mode, setting chat width to 70%');
        setChatWidthPercent(70); // Fixed 70% for tablet
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  // Handle pane resizing
  const handleResize = useCallback((newChatWidth: number) => {
    console.log('🔄 MainLayout handleResize called with newChatWidth:', newChatWidth);
    
    // Convert pixel width to percentage
    const containerWidth = window.innerWidth;
    const newPercent = (newChatWidth / containerWidth) * 100;
    
    console.log('📏 Container width:', containerWidth, 'New percent:', newPercent);
    
    // Ensure minimum widths are respected
    const minChatPercent = (minChatWidth / containerWidth) * 100;
    const minTheoryPercent = (minTheoryWidth / containerWidth) * 100;
    
    console.log('📐 Min chat percent:', minChatPercent, 'Min theory percent:', minTheoryPercent);
    
    const clampedPercent = Math.max(
      minChatPercent,
      Math.min(100 - minTheoryPercent, newPercent)
    );
    
    console.log('🔒 Clamped percent:', clampedPercent, 'Theory will be:', 100 - clampedPercent);
    
    setChatWidthPercent(clampedPercent);
    saveLayoutPreference(clampedPercent);
    
    // Announce layout change to screen readers
    if (layoutAnnouncementRef.current) {
      const chatPercent = Math.round(clampedPercent);
      const theoryPercent = Math.round(100 - clampedPercent);
      layoutAnnouncementRef.current.textContent = 
        `Layout resized: Chat pane ${chatPercent}%, Theory pane ${theoryPercent}%`;
    }
  }, [minChatWidth, minTheoryWidth, saveLayoutPreference]);

  // Calculate theory width percentage
  const theoryWidthPercent = 100 - chatWidthPercent;
  
  // Debug: Log actual rendered dimensions
  useEffect(() => {
    const checkDimensions = () => {
      const chatPane = document.querySelector('.main-layout__chat-pane') as HTMLElement;
      const theoryPane = document.querySelector('.main-layout__theory-pane') as HTMLElement;
      const separator = document.querySelector('.main-layout__separator-container') as HTMLElement;
      
      if (chatPane && theoryPane) {
        console.log('📐 Actual dimensions:');
        console.log('  Chat pane:', chatPane.offsetWidth, 'px');
        console.log('  Theory pane:', theoryPane.offsetWidth, 'px');
        console.log('  Separator:', separator?.offsetWidth || 0, 'px');
        console.log('  Window width:', window.innerWidth, 'px');
        console.log('  Chat %:', (chatPane.offsetWidth / window.innerWidth * 100).toFixed(1), '%');
        console.log('  Theory %:', (theoryPane.offsetWidth / window.innerWidth * 100).toFixed(1), '%');
        
        // Check if theory pane is too narrow
        if (theoryPane.offsetWidth < 100) {
          console.warn('⚠️ Theory pane is very narrow:', theoryPane.offsetWidth, 'px');
        }
      }
    };
    
    // Check dimensions after a short delay to allow for rendering
    const timeoutId = setTimeout(checkDimensions, 100);
    
    return () => clearTimeout(timeoutId);
  }, [chatWidthPercent, theoryWidthPercent]);

  // Handle keyboard navigation for layout
  const handleLayoutKeyDown = useCallback((event: React.KeyboardEvent) => {
    // Handle Escape key to reset layout to default
    if (event.key === 'Escape') {
      setChatWidthPercent(initialChatWidth);
      saveLayoutPreference(initialChatWidth);
      
      if (layoutAnnouncementRef.current) {
        layoutAnnouncementRef.current.textContent = 'Layout reset to default proportions';
      }
    }
    
    // Handle F6 to cycle focus between panes
    if (event.key === 'F6') {
      event.preventDefault();
      const chatPane = mainLayoutRef.current?.querySelector('.main-layout__chat-pane [tabindex="0"]') as HTMLElement;
      const theoryPane = mainLayoutRef.current?.querySelector('.main-layout__theory-pane [tabindex="0"]') as HTMLElement;
      const separator = mainLayoutRef.current?.querySelector('.resizable-separator') as HTMLElement;
      
      const currentFocus = document.activeElement;
      
      if (currentFocus === chatPane && separator) {
        separator.focus();
      } else if (currentFocus === separator && theoryPane) {
        theoryPane.focus();
      } else if (chatPane) {
        chatPane.focus();
      }
    }
  }, [initialChatWidth, saveLayoutPreference]);

  // Render mobile layout (single pane)
  if (isMobile) {
    return (
      <div 
        className="main-layout main-layout--mobile"
        ref={mainLayoutRef}
        onKeyDown={handleLayoutKeyDown}
        role="application"
        aria-label="Chat application - mobile layout"
      >
        {/* Live region for layout announcements */}
        <div
          ref={layoutAnnouncementRef}
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />
        
        <main 
          className="main-layout__chat-pane main-layout__chat-pane--mobile"
          role="main"
          aria-label="Chat conversation"
        >
          {children}
        </main>
      </div>
    );
  }

  // Render tablet/desktop layout (dual pane)
  return (
    <div 
      className="main-layout main-layout--desktop"
      ref={mainLayoutRef}
      onKeyDown={handleLayoutKeyDown}
      role="application"
      aria-label={`Chat application - dual pane layout (Chat: ${Math.round(chatWidthPercent)}%, Theory: ${Math.round(theoryWidthPercent)}%)`}
    >
      {/* Live region for layout announcements */}
      <div
        ref={layoutAnnouncementRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      
      {/* Instructions for keyboard users */}
      <div className="sr-only">
        Press F6 to cycle between panes, Escape to reset layout. Use arrow keys on separator to resize panes.
      </div>
      
      <main 
        className="main-layout__chat-pane"
        style={{ width: `${chatWidthPercent}%` }}
        role="main"
        aria-label="Chat conversation pane"
      >
        {children}
      </main>
      
      {!isTablet && (
        <div className="main-layout__separator-container">
          <ResizableSeparator
            onResize={handleResize}
            minChatWidth={minChatWidth}
            minTheoryWidth={minTheoryWidth}
          />
        </div>
      )}
      
      <div 
        className="main-layout__theory-pane"
        style={{ width: `${theoryWidthPercent}%` }}
        aria-label="Theory and logical context pane"
      >
        <TheorySection />
      </div>
    </div>
  );
};

export default MainLayout;