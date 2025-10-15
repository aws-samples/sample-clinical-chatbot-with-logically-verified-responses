import React from 'react';
import '../styles/ProgressBubble.css';

interface ProgressBubbleProps {
  content: string;
  type: 'assistant_response' | 'logical_extraction' | 'validation' | 'processing';
  isAnimating?: boolean;
}

/**
 * ProgressBubble component for showing temporary streaming progress
 * Displays as a dotted-outline speech bubble on the left side
 */
export const ProgressBubble: React.FC<ProgressBubbleProps> = ({
  content,
  type,
  isAnimating = false
}) => {
  const getIcon = (type: string): string => {
    switch (type) {
      case 'assistant_response':
        return '💭';
      case 'logical_extraction':
        return '🧠';
      case 'validation':
        return '🔍';
      case 'processing':
        return '⚙️';
      default:
        return '⏳';
    }
  };

  // Function to parse and format content with <tt>...</tt> tags
  const formatContent = (text: string) => {
    // Split by <tt> and </tt> tags
    const parts = text.split(/(<tt>.*?<\/tt>)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('<tt>') && part.endsWith('</tt>')) {
        // Extract content between <tt> tags and format as monospace
        const monoContent = part.slice(4, -5); // Remove <tt> and </tt>
        return (
          <code 
            key={index}
            style={{ 
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
              backgroundColor: '#f5f5f5',
              padding: '2px 4px',
              borderRadius: '3px',
              fontSize: '0.85em'
            }}
          >
            {monoContent}
          </code>
        );
      }
      return part;
    });
  };





  return (
    <div className={`progress-bubble ${isAnimating ? 'progress-bubble--animating' : ''}`}>
      <div className="progress-bubble__avatar">
        <span className="progress-bubble__icon">{getIcon(type)}</span>
      </div>
      
      <div className="progress-bubble__content">
        <div className="progress-bubble__text">
          {formatContent(content)}
        </div>
        

      </div>
    </div>
  );
};

export default ProgressBubble;