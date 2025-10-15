"""
Chat service for processing user messages and generating responses
"""

import asyncio
import random
import logging
from datetime import datetime
from typing import Dict, List, Optional

from ..core.exceptions import ChatServiceError, ValidationError, NetworkError, TimeoutError

logger = logging.getLogger(__name__)

class ChatService:
    """Service for handling chat message processing"""
    
    def __init__(self):
        self.response_templates = self._initialize_response_templates()
        self.conversation_context: List[Dict[str, str]] = []
        
    def _initialize_response_templates(self) -> Dict[str, List[str]]:
        """Initialize response templates for different message types"""
        return {
            "greeting": [
                "Hello! It's great to meet you. How can I assist you today?",
                "Hi there! I'm here to help. What would you like to talk about?",
                "Greetings! How can I help you today?",
                "Hello! What can I do for you?",
            ],
            "help": [
                "I'm here to help! What specific question or topic would you like assistance with?",
                "I'd be happy to assist you. What do you need help with?",
                "How can I help you today? Feel free to ask me anything!",
                "I'm ready to help! What would you like to know?",
            ],
            "thanks": [
                "You're very welcome! I'm glad I could help. Is there anything else you'd like to know?",
                "Happy to help! Feel free to ask if you have any other questions.",
                "You're welcome! I'm here if you need anything else.",
                "Glad I could assist! Let me know if there's anything else I can help with.",
            ],
            "goodbye": [
                "Goodbye! It was nice chatting with you. Feel free to come back anytime if you have more questions.",
                "Take care! Don't hesitate to return if you need any assistance.",
                "Farewell! I'll be here whenever you need help.",
                "See you later! Come back anytime you have questions.",
                "Bye! Have a great day!",
            ],
            "question": [
                "That's a thoughtful question! Based on what you're asking, here's my perspective.",
                "Great question! Let me help you with that.",
                "I understand what you're asking. Here's what I think about that.",
                "That's an interesting question. Let me share some insights.",
            ],
            "default": [
                "I understand what you're saying. How can I help you with that?",
                "That's interesting! Tell me more about what you'd like to know.",
                "I see. What specific aspect would you like me to help you with?",
                "Thanks for sharing that. How can I assist you further?",
            ]
        }
    
    async def process_message(self, message: str) -> str:
        """
        Process a user message and generate an appropriate response using the theorem prover
        
        Args:
            message: The user's input message
            
        Returns:
            Generated response string
            
        Raises:
            ChatServiceError: For various processing errors
        """
        try:
            # Validate input
            self._validate_message(message)
            
            # Import the process_user_response function
            # We need to import it here to avoid circular imports
            import sys
            import os
            root_dir = os.path.join(os.path.dirname(__file__), '..', '..', '..')
            if root_dir not in sys.path:
                sys.path.insert(0, root_dir)
            
            try:
                from interface import process_user_response
                
                # Process the message using the theorem prover interface
                logger.info("Processing message with theorem prover interface...")
                response_obj = process_user_response(message, do_corrupt=True)
                
                # Extract the assistant response
                response = response_obj.assistant_response
                
                # Log additional information from the theorem prover
                if response_obj.extracted_logical_stmt:
                    logger.info(f"Extracted logical statement: {response_obj.extracted_logical_stmt}")
                if response_obj.valid is not None:
                    logger.info(f"Statement validity: {response_obj.valid}")
                if response_obj.durations:
                    logger.info(f"Processing durations: {response_obj.durations}")
                
                logger.info("Successfully processed message with theorem prover")
                
            except ImportError as e:
                logger.warning(f"Could not import theorem prover interface: {e}")
                logger.info("Falling back to simple response generation...")
                
                # Fallback to simple response generation
                await self._simulate_processing_delay()
                response = self._generate_contextual_response(message)
            
            # Store in conversation context
            self._update_conversation_context(message, response)
            
            return response
            
        except ChatServiceError:
            # Re-raise known errors
            raise
        except Exception as e:
            logger.error(f"Unexpected error in process_message: {e}")
            raise ChatServiceError(
                "An unexpected error occurred while processing your message",
                "PROCESSING_ERROR",
                True
            )
    
    def _validate_message(self, message: str) -> None:
        """Validate the input message"""
        if not message or not message.strip():
            raise ValidationError("Message cannot be empty")
        
        if len(message.strip()) > 1000:
            raise ValidationError("Message cannot exceed 1000 characters")
    
    async def _simulate_processing_delay(self) -> None:
        """Simulate realistic processing delay"""
        # Random delay between 0.5 and 2 seconds
        delay = random.uniform(0.5, 2.0)
        await asyncio.sleep(delay)
    
    async def _simulate_random_errors(self) -> None:
        """Occasionally simulate errors for testing purposes"""
        # Only simulate errors if explicitly enabled (disabled for tests)
        import os
        if os.getenv('ENABLE_ERROR_SIMULATION', 'false').lower() != 'true':
            return
            
        # 5% chance of network error
        if random.random() < 0.05:
            raise NetworkError("Simulated network connection failure")
        
        # 3% chance of timeout error
        if random.random() < 0.03:
            raise TimeoutError("Simulated request timeout")
    
    def _generate_contextual_response(self, message: str) -> str:
        """Generate a contextual response based on the message content"""
        message_lower = message.lower()
        
        # Determine message type and select appropriate response
        if any(word in message_lower for word in ['hello', 'hi', 'hey', 'greetings']):
            response_type = "greeting"
        elif any(word in message_lower for word in ['help', 'assist', 'support']):
            response_type = "help"
        elif any(word in message_lower for word in ['thank', 'thanks', 'appreciate']):
            response_type = "thanks"
        elif any(word in message_lower for word in ['bye', 'goodbye', 'farewell', 'see you later']):
            response_type = "goodbye"
        elif '?' in message:
            response_type = "question"
        else:
            response_type = "default"
        
        # Select a random response from the appropriate category
        responses = self.response_templates[response_type]
        base_response = random.choice(responses)
        
        # Add some personalization based on message content
        if response_type == "question":
            # For questions, try to be more specific
            if any(word in message_lower for word in ['weather', 'time', 'date']):
                base_response = "I'd love to help with that, but I don't have access to real-time information like weather or current time. Is there something else I can assist you with?"
            elif any(word in message_lower for word in ['name', 'who are you']):
                base_response = "I'm an AI assistant created to help answer questions and have conversations. What would you like to know?"
        
        return base_response
    
    def _update_conversation_context(self, user_message: str, assistant_response: str) -> None:
        """Update the conversation context for potential future use"""
        self.conversation_context.append({
            "user": user_message,
            "assistant": assistant_response,
            "timestamp": self.get_current_timestamp()
        })
        
        # Keep only the last 10 exchanges to prevent memory issues
        if len(self.conversation_context) > 10:
            self.conversation_context = self.conversation_context[-10:]
    
    def get_current_timestamp(self) -> str:
        """Get current timestamp in ISO format"""
        return datetime.utcnow().isoformat() + "Z"
    
    def get_conversation_history(self) -> List[Dict[str, str]]:
        """Get the current conversation history"""
        return self.conversation_context.copy()
    
    def clear_conversation_history(self) -> None:
        """Clear the conversation history"""
        self.conversation_context.clear()