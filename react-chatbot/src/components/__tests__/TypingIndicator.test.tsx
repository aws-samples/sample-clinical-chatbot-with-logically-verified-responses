import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TypingIndicator from '../TypingIndicator';

describe('TypingIndicator', () => {
  it('renders when isVisible is true', () => {
    const { container } = render(<TypingIndicator isVisible={true} />);
    
    const typingIndicator = container.querySelector('.typing-indicator-wrapper');
    expect(typingIndicator).toBeInTheDocument();
  });

  it('does not render when isVisible is false', () => {
    const { container } = render(<TypingIndicator isVisible={false} />);
    
    expect(container.firstChild).toBeNull();
  });

  it('renders three typing dots', () => {
    const { container } = render(<TypingIndicator isVisible={true} />);
    
    const dots = container.querySelectorAll('.typing-dot');
    expect(dots).toHaveLength(3);
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-typing-indicator';
    const { container } = render(<TypingIndicator isVisible={true} className={customClass} />);
    
    const wrapper = container.querySelector('.typing-indicator-wrapper');
    expect(wrapper).toHaveClass('typing-indicator-wrapper');
    expect(wrapper).toHaveClass(customClass);
  });

  it('has proper CSS classes for styling', () => {
    const { container } = render(<TypingIndicator isVisible={true} />);
    
    const wrapper = container.querySelector('.typing-indicator-wrapper');
    expect(wrapper).toHaveClass('typing-indicator-wrapper');
    
    const bubble = container.querySelector('.typing-indicator-bubble');
    expect(bubble).toBeInTheDocument();
    
    const dotsContainer = container.querySelector('.typing-dots');
    expect(dotsContainer).toBeInTheDocument();
    
    const dots = container.querySelectorAll('.typing-dot');
    expect(dots).toHaveLength(3);
  });
});