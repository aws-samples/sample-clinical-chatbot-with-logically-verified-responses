import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ResizableSeparatorProps } from '../types/components';
import '../styles/ResizableSeparator.css';

/**
 * ResizableSeparator component for interactive pane resizing
 * Provides drag functionality with minimum width constraints and visual feedback
 */
export const ResizableSeparator: React.FC<ResizableSeparatorProps> = ({
  onResize,
  minChatWidth,
  minTheoryWidth
}) => {
  const separatorRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef({
    isDragging: false,
    dragStartX: 0,
    initialChatWidth: 0
  });

  // Handle mouse move during dragging
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!dragStateRef.current.isDragging) return;
    
    const deltaX = event.clientX - dragStateRef.current.dragStartX;
    const newChatWidth = dragStateRef.current.initialChatWidth + deltaX;
    const containerWidth = window.innerWidth;
    
    console.log('🖱️ Mouse move - deltaX:', deltaX, 'newChatWidth:', newChatWidth, 'containerWidth:', containerWidth);
    
    // Calculate minimum and maximum widths
    const maxChatWidth = containerWidth - minTheoryWidth;
    
    console.log('📏 Constraints - minChatWidth:', minChatWidth, 'maxChatWidth:', maxChatWidth, 'minTheoryWidth:', minTheoryWidth);
    
    // Clamp the new width within constraints
    const clampedWidth = Math.max(
      minChatWidth,
      Math.min(maxChatWidth, newChatWidth)
    );
    
    console.log('🔒 Clamped width:', clampedWidth, 'Theory width will be:', containerWidth - clampedWidth);
    
    // Call onResize to update the layout
    onResize(clampedWidth);
  }, [minChatWidth, minTheoryWidth, onResize]);

  // Handle mouse up to end dragging
  const handleMouseUp = useCallback(() => {
    console.log('🖱️ Mouse up - ending drag');
    dragStateRef.current.isDragging = false;
    setIsDragging(false);
    
    // Remove global mouse event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    // Restore normal cursor and text selection
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, [handleMouseMove]);

  // Handle mouse down to start dragging
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    
    const chatPane = document.querySelector('.main-layout__chat-pane') as HTMLElement;
    
    if (!chatPane) {
      console.error('❌ Chat pane not found during mouse down');
      return;
    }
    
    const currentChatWidth = chatPane.offsetWidth;
    
    console.log('🖱️ Mouse down - starting drag. Current chat width:', currentChatWidth, 'clientX:', event.clientX);
    
    // Update both state and ref
    dragStateRef.current = {
      isDragging: true,
      dragStartX: event.clientX,
      initialChatWidth: currentChatWidth
    };
    setIsDragging(true);
    
    // Add global mouse event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, [handleMouseMove, handleMouseUp]);

  // Handle keyboard navigation for accessibility
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const step = 20; // Pixels to move per key press
    const containerWidth = window.innerWidth;
    const chatPane = document.querySelector('.main-layout__chat-pane') as HTMLElement;
    
    if (!chatPane) return;
    
    const currentChatWidth = chatPane.offsetWidth;
    let newWidth = currentChatWidth;
    let announcement = '';
    
    switch (event.key) {
      case 'ArrowLeft':
        newWidth = Math.max(minChatWidth, currentChatWidth - step);
        announcement = 'Chat pane made smaller';
        break;
      case 'ArrowRight':
        newWidth = Math.min(containerWidth - minTheoryWidth, currentChatWidth + step);
        announcement = 'Chat pane made larger';
        break;
      case 'Home':
        newWidth = minChatWidth;
        announcement = 'Chat pane set to minimum width';
        break;
      case 'End':
        newWidth = containerWidth - minTheoryWidth;
        announcement = 'Chat pane set to maximum width';
        break;
      case 'Enter':
      case ' ':
        // Reset to default (50/50 split)
        newWidth = containerWidth * 0.5;
        announcement = 'Layout reset to equal split';
        break;
      case 'Escape':
        // Let parent handle escape
        return;
      default:
        return; // Don't prevent default for other keys
    }
    
    event.preventDefault();
    onResize(newWidth);
    
    // Announce the change
    const instructionsElement = document.getElementById('separator-instructions');
    if (instructionsElement && announcement) {
      instructionsElement.textContent = announcement;
      // Reset after a delay
      setTimeout(() => {
        if (instructionsElement) {
          instructionsElement.textContent = 'Use arrow keys to resize panes, Home and End keys to go to minimum and maximum sizes, Enter or Space to reset to equal split';
        }
      }, 2000);
    }
  }, [minChatWidth, minTheoryWidth, onResize]);

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={separatorRef}
      className={`resizable-separator ${isDragging ? 'resizable-separator--dragging' : ''}`}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize chat and theory panes"
      aria-describedby="separator-instructions"
    >
      <div className="resizable-separator__handle">
        <div className="resizable-separator__grip">
          <div className="resizable-separator__grip-dot" />
          <div className="resizable-separator__grip-dot" />
          <div className="resizable-separator__grip-dot" />
        </div>
      </div>
      
      {/* Screen reader instructions */}
      <div id="separator-instructions" className="sr-only" aria-live="polite">
        Use arrow keys to resize panes, Home and End keys to go to minimum and maximum sizes, Enter or Space to reset to equal split
      </div>
    </div>
  );
};

export default ResizableSeparator;