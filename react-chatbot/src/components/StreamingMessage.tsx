import React, { useState, useEffect, useRef } from 'react';
import { chatService } from '../services/ChatService';
import type { StreamingUpdate, ProgressUpdate, FinalSummary } from '../services/ChatService';
import ProgressBubble from './ProgressBubble';
import '../styles/StreamingMessage.css';

// Interface for tracking the final summary data
interface FinalSummaryState {
  assistant_response?: string;
  corrupted_response?: string;
  extracted_logical_stmt?: string;
  durations?: Record<string, number>;
  valid?: string;
  original_result?: string;
  negated_result?: string;
  error_messages?: string[];
  progress_messages?: string[];
  extra_delay?: number;
}



interface StreamingMessageProps {
  message: string;
  doCorrupt?: boolean;
  onComplete: (
    finalMessage: string, 
    validationStatus?: string, 
    initialResponse?: string, 
    corruptedResponse?: string,
    extractedLogicalStmt?: string,
    originalResult?: string,
    negatedResult?: string,
    durations?: Record<string, number>
  ) => void;
  onError: (error: Error) => void;
}

interface ProgressBubbleData {
  id: string;
  content: string;
  type: 'assistant_response' | 'logical_extraction' | 'validation' | 'processing';
  isAnimating: boolean;
}

/**
 * StreamingMessage component that shows real-time progress as individual speech bubbles
 */
export const StreamingMessage: React.FC<StreamingMessageProps> = ({
  message,
  doCorrupt = false,
  onComplete,
  onError,
}) => {
  const [progressBubbles, setProgressBubbles] = useState<ProgressBubbleData[]>([]);
  const streamingRef = useRef<{ message: string; isStreaming: boolean }>({ message: '', isStreaming: false });

  useEffect(() => {
    console.log('Debug - StreamingMessage useEffect triggered for message:', message);
    
    // Prevent duplicate streaming for the same message (React StrictMode protection)
    if (streamingRef.current.message === message && streamingRef.current.isStreaming) {
      console.log('Debug - Duplicate streaming prevented for same message');
      return;
    }
    
    // Reset state for new message
    console.log('Debug - Resetting progress bubbles for new message');
    setProgressBubbles([]);
    streamingRef.current = { message, isStreaming: true };
    
    let isMounted = true;
    let bubbleCounter = 0;
    let finalSummary: FinalSummaryState = {}; // Final summary data
    const abortController = new AbortController();

    const addProgressBubble = (content: string, type: ProgressBubbleData['type'], isAnimating = true) => {
      const bubble: ProgressBubbleData = {
        id: `${type}-${++bubbleCounter}`,
        content,
        type,
        isAnimating
      };

      console.log('Debug - Adding progress bubble:', bubble.id, content);
      setProgressBubbles(prev => {
        const newBubbles = [...prev, bubble];
        console.log('Debug - Total bubbles now:', newBubbles.length);
        return newBubbles;
      });
      return bubble.id;
    };



    const handleStreamingUpdate = (event: StreamingUpdate) => {
      if (!isMounted) return;

      if (event.type === 'progress') {
        // Handle ProgressUpdate events - just display the message
        const progressEvent = event as ProgressUpdate;
        
        addProgressBubble(
          progressEvent.message,
          'processing',
          true
        );
      } else if (event.type === 'final') {
        // Handle FinalSummary events
        const finalEvent = event as FinalSummary;
        console.log('Debug - FinalSummary event received:', finalEvent);
        console.log('Debug - assistant_response from event:', finalEvent.assistant_response);
        console.log('Debug - corrupted_response from event:', finalEvent.corrupted_response);
        console.log('Debug - extracted_logical_stmt from event:', finalEvent.extracted_logical_stmt);
        
        finalSummary = {
          assistant_response: finalEvent.assistant_response,
          corrupted_response: finalEvent.corrupted_response,
          extracted_logical_stmt: finalEvent.extracted_logical_stmt,
          durations: finalEvent.durations,
          valid: finalEvent.valid,
          original_result: finalEvent.original_result,
          negated_result: finalEvent.negated_result,
          error_messages: finalEvent.error_messages,
          progress_messages: finalEvent.progress_messages,
          extra_delay: finalEvent.extra_delay,
        };
        
        console.log('Debug - finalSummary after assignment:', finalSummary);
        console.log('Debug - extra_delay value:', finalSummary.extra_delay);

        // Remove all progress bubbles after a delay (default 1000ms + extra_delay if provided)
        const totalDelay = 1000 + (finalSummary.extra_delay || 0);
        console.log('Debug - Total delay calculated:', totalDelay, 'ms');
        
        // First clear the bubbles after a short delay to show them briefly
        setTimeout(() => {
          console.log('Debug - First timeout: clearing bubbles after', totalDelay, 'ms');
          if (isMounted) {
            console.log('Debug - Component still mounted, clearing bubbles now');
            setProgressBubbles([]);
          }
        }, totalDelay);

        // Then call onComplete after an additional small delay to ensure bubbles are cleared visually
        setTimeout(() => {
          console.log('Debug - Second timeout: calling onComplete after bubbles cleared');
          if (isMounted) {
            // Use the final summary for the response
            // Only use corrupted_response if it's different from assistant_response
            console.log('Debug - finalSummary.assistant_response:', finalSummary.assistant_response);
            console.log('Debug - finalSummary.corrupted_response:', finalSummary.corrupted_response);
            console.log('Debug - Are they different?', finalSummary.corrupted_response !== finalSummary.assistant_response);
            
            const finalResponse = (finalSummary.corrupted_response && 
                                 finalSummary.corrupted_response !== finalSummary.assistant_response) 
              ? finalSummary.corrupted_response 
              : finalSummary.assistant_response;
            
            console.log('Debug - finalResponse selected:', finalResponse);
            
            if (finalResponse) {
              onComplete(
                finalResponse, 
                finalSummary.valid,
                finalSummary.assistant_response,
                finalSummary.corrupted_response,
                finalSummary.extracted_logical_stmt,
                finalSummary.original_result,
                finalSummary.negated_result,
                finalSummary.durations
              );
            } else {
              onError(new Error('No assistant response received'));
            }
          }
        }, totalDelay + 100); // Add 100ms buffer to ensure visual clearing
      }
    };

    const startStreaming = async () => {
      if (abortController.signal.aborted) return;
      
      try {
        await chatService.sendMessageStream(message, handleStreamingUpdate, doCorrupt);
      } catch (error) {
        if (isMounted && !abortController.signal.aborted) {
          onError(error as Error);
        }
      }
    };

    startStreaming();

    return () => {
      console.log('Debug - StreamingMessage component unmounting');
      isMounted = false;
      abortController.abort();
      streamingRef.current.isStreaming = false;
    };
  }, [message, onComplete, onError]);

  return (
    <div className="streaming-message">
      <div className="streaming-message__bubbles">
        {progressBubbles.map((bubble) => (
          <ProgressBubble
            key={bubble.id}
            content={bubble.content}
            type={bubble.type}
            isAnimating={bubble.isAnimating}
          />
        ))}
      </div>
    </div>
  );
};

export default StreamingMessage;