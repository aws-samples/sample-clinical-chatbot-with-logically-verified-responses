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
}



interface StreamingMessageProps {
  message: string;
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
  onComplete,
  onError,
}) => {
  const [progressBubbles, setProgressBubbles] = useState<ProgressBubbleData[]>([]);
  const streamingRef = useRef<{ message: string; isStreaming: boolean }>({ message: '', isStreaming: false });

  useEffect(() => {
    // Prevent duplicate streaming for the same message (React StrictMode protection)
    if (streamingRef.current.message === message && streamingRef.current.isStreaming) {
      return;
    }
    
    // Reset state for new message
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

      setProgressBubbles(prev => [...prev, bubble]);
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
        };
        
        console.log('Debug - finalSummary after assignment:', finalSummary);

        // Remove all progress bubbles after a short delay (0.25 seconds)
        setTimeout(() => {
          if (isMounted) {
            setProgressBubbles([]);
            
            // Use the final summary for the response
            // Prioritize corrupted_response over assistant_response
            const finalResponse = finalSummary.corrupted_response || finalSummary.assistant_response;
            
            if (finalResponse) {
              console.log('Debug - Calling onComplete with extracted_logical_stmt:', finalSummary.extracted_logical_stmt);
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
        }, 1000);
      }
    };

    const startStreaming = async () => {
      if (abortController.signal.aborted) return;
      
      try {
        await chatService.sendMessageStream(message, handleStreamingUpdate);
      } catch (error) {
        if (isMounted && !abortController.signal.aborted) {
          onError(error as Error);
        }
      }
    };

    startStreaming();

    return () => {
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