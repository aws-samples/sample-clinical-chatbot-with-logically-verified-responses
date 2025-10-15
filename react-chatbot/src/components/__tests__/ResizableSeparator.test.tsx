import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ResizableSeparator from '../ResizableSeparator';

// Mock DOM methods
Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
  configurable: true,
  value: 500,
});

Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1000,
});

describe('ResizableSeparator Component', () => {
  const mockOnResize = vi.fn();
  const defaultProps = {
    onResize: mockOnResize,
    minChatWidth: 300,
    minTheoryWidth: 250,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock querySelector to return a mock chat pane element
    const mockChatPane = {
      offsetWidth: 500,
    };
    
    vi.spyOn(document, 'querySelector').mockImplementation((selector) => {
      if (selector === '.main-layout__chat-pane') {
        return mockChatPane as any;
      }
      return null;
    });
    
    // Reset body styles
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    
    // Mock addEventListener and removeEventListener
    vi.spyOn(document, 'addEventListener');
    vi.spyOn(document, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up any remaining event listeners
    document.removeEventListener('mousemove', vi.fn());
    document.removeEventListener('mouseup', vi.fn());
  });

  describe('Drag Functionality and Constraint Enforcement', () => {
    it('should render with proper accessibility attributes', () => {
      render(<ResizableSeparator {...defaultProps} />);
      
      const separator = screen.getByRole('separator');
      expect(separator).toHaveAttribute('aria-orientation', 'vertical');
      expect(separator).toHaveAttribute('aria-label', 'Resize chat and theory panes');
      expect(separator).toHaveAttribute('tabIndex', '0');
      expect(separator).toHaveAttribute('aria-describedby', 'separator-instructions');
      
      const instructions = document.getElementById('separator-instructions');
      expect(instructions).toBeInTheDocument();
      expect(instructions).toHaveTextContent(/Use arrow keys to resize panes/);
    });

    it('should handle mouse down event and setup event listeners', () => {
      render(<ResizableSeparator {...defaultProps} />);
      
      const separator = screen.getByRole('separator');
      
      fireEvent.mouseDown(separator, { clientX: 500 });
      
      // Check that event listeners are added
      expect(document.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(document.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
    });

    it('should handle dragging when chat pane is not found', () => {
      // Mock querySelector to return null
      vi.spyOn(document, 'querySelector').mockReturnValue(null);
      
      render(<ResizableSeparator {...defaultProps} />);
      
      const separator = screen.getByRole('separator');
      
      // Should not throw error when chat pane is not found
      expect(() => {
        fireEvent.mouseDown(separator, { clientX: 500 });
      }).not.toThrow();
      
      expect(mockOnResize).not.toHaveBeenCalled();
    });

    it('should handle props correctly', () => {
      render(<ResizableSeparator {...defaultProps} />);
      
      const separator = screen.getByRole('separator');
      expect(separator).toBeInTheDocument();
      
      // Component should render without errors with the provided props
      expect(typeof defaultProps.onResize).toBe('function');
      expect(typeof defaultProps.minChatWidth).toBe('number');
      expect(typeof defaultProps.minTheoryWidth).toBe('number');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle arrow key navigation', () => {
      render(<ResizableSeparator {...defaultProps} />);
      
      const separator = screen.getByRole('separator');
      
      // Test left arrow key
      fireEvent.keyDown(separator, { key: 'ArrowLeft' });
      expect(mockOnResize).toHaveBeenCalled();
      
      // Reset mock
      mockOnResize.mockClear();
      
      // Test right arrow key
      fireEvent.keyDown(separator, { key: 'ArrowRight' });
      expect(mockOnResize).toHaveBeenCalled();
    });

    it('should handle Home and End keys', () => {
      render(<ResizableSeparator {...defaultProps} />);
      
      const separator = screen.getByRole('separator');
      
      // Test Home key (minimum width)
      fireEvent.keyDown(separator, { key: 'Home' });
      expect(mockOnResize).toHaveBeenCalledWith(defaultProps.minChatWidth);
      
      // Reset mock
      mockOnResize.mockClear();
      
      // Test End key (maximum width)
      fireEvent.keyDown(separator, { key: 'End' });
      const expectedMaxWidth = window.innerWidth - defaultProps.minTheoryWidth;
      expect(mockOnResize).toHaveBeenCalledWith(expectedMaxWidth);
    });

    it('should handle Enter and Space keys for reset functionality', () => {
      // Mock querySelector to return a mock chat pane element
      const mockChatPane = {
        offsetWidth: 600
      };
      
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1000,
      });
      
      vi.spyOn(document, 'querySelector').mockImplementation((selector) => {
        if (selector === '.main-layout__chat-pane') {
          return mockChatPane as any;
        }
        return null;
      });

      render(<ResizableSeparator {...defaultProps} />);
      
      const separator = screen.getByRole('separator');
      
      // Test that Enter and Space keys trigger reset to 50/50 split
      fireEvent.keyDown(separator, { key: 'Enter' });
      expect(mockOnResize).toHaveBeenCalledWith(500); // 1000 * 0.5
      
      mockOnResize.mockClear();
      
      fireEvent.keyDown(separator, { key: ' ' });
      expect(mockOnResize).toHaveBeenCalledWith(500); // 1000 * 0.5
      
      mockOnResize.mockClear();
      
      // Test that other keys don't trigger resize
      fireEvent.keyDown(separator, { key: 'Tab' });
      expect(mockOnResize).not.toHaveBeenCalled();
    });

    it('should handle keyboard navigation when chat pane is not found', () => {
      // Mock querySelector to return null
      vi.spyOn(document, 'querySelector').mockReturnValue(null);
      
      render(<ResizableSeparator {...defaultProps} />);
      
      const separator = screen.getByRole('separator');
      
      // Should not throw error when chat pane is not found
      expect(() => {
        fireEvent.keyDown(separator, { key: 'ArrowLeft' });
      }).not.toThrow();
      
      expect(mockOnResize).not.toHaveBeenCalled();
    });
  });

  describe('Visual Feedback and Styling', () => {
    it('should render visual elements correctly', () => {
      render(<ResizableSeparator {...defaultProps} />);
      
      const separator = screen.getByRole('separator');
      expect(separator).toHaveClass('resizable-separator');
      
      const handle = separator.querySelector('.resizable-separator__handle');
      expect(handle).toBeInTheDocument();
      
      const grip = separator.querySelector('.resizable-separator__grip');
      expect(grip).toBeInTheDocument();
      
      const gripDots = separator.querySelectorAll('.resizable-separator__grip-dot');
      expect(gripDots).toHaveLength(3);
    });

    it('should provide screen reader instructions', () => {
      render(<ResizableSeparator {...defaultProps} />);
      
      const instructions = document.getElementById('separator-instructions');
      expect(instructions).toBeInTheDocument();
      expect(instructions).toHaveClass('sr-only');
      expect(instructions).toHaveTextContent(
        'Use arrow keys to resize panes, Home and End keys to go to minimum and maximum sizes'
      );
    });

    it('should have proper CSS classes', () => {
      render(<ResizableSeparator {...defaultProps} />);
      
      const separator = screen.getByRole('separator');
      expect(separator).toHaveClass('resizable-separator');
      
      // Initially should not have dragging class
      expect(separator).not.toHaveClass('resizable-separator--dragging');
    });
  });

  describe('Event Cleanup and Memory Management', () => {
    it('should clean up event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      const { unmount } = render(<ResizableSeparator {...defaultProps} />);
      
      // Start a drag operation
      const separator = screen.getByRole('separator');
      fireEvent.mouseDown(separator, { clientX: 500 });
      
      // Unmount component
      unmount();
      
      // Verify cleanup
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
      expect(document.body.style.userSelect).toBe('');
      expect(document.body.style.cursor).toBe('');
    });

    it('should prevent memory leaks from event listeners', () => {
      const { unmount } = render(<ResizableSeparator {...defaultProps} />);
      
      const separator = screen.getByRole('separator');
      
      // Start dragging but don't finish
      fireEvent.mouseDown(separator, { clientX: 500 });
      
      // Unmount while dragging
      unmount();
      
      // Verify that body styles are cleaned up even if dragging was interrupted
      expect(document.body.style.userSelect).toBe('');
      expect(document.body.style.cursor).toBe('');
    });

    it('should handle component lifecycle correctly', () => {
      const { unmount } = render(<ResizableSeparator {...defaultProps} />);
      
      // Component should render and unmount without errors
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle component with different prop values', () => {
      const customProps = {
        onResize: vi.fn(),
        minChatWidth: 400,
        minTheoryWidth: 300,
      };
      
      render(<ResizableSeparator {...customProps} />);
      
      const separator = screen.getByRole('separator');
      expect(separator).toBeInTheDocument();
      
      // Should render without errors with different prop values
      expect(separator).toHaveAttribute('aria-label', 'Resize chat and theory panes');
    });

    it('should handle keyboard events with different window sizes', () => {
      window.innerWidth = 800;
      
      render(<ResizableSeparator {...defaultProps} />);
      
      const separator = screen.getByRole('separator');
      
      // Should handle keyboard events without errors
      expect(() => {
        fireEvent.keyDown(separator, { key: 'Home' });
        fireEvent.keyDown(separator, { key: 'End' });
      }).not.toThrow();
    });

    it('should handle component re-renders correctly', () => {
      const { rerender } = render(<ResizableSeparator {...defaultProps} />);
      
      const newProps = {
        ...defaultProps,
        minChatWidth: 400,
      };
      
      expect(() => {
        rerender(<ResizableSeparator {...newProps} />);
      }).not.toThrow();
      
      const separator = screen.getByRole('separator');
      expect(separator).toBeInTheDocument();
    });
  });
});