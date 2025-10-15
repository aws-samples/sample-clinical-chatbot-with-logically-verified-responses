"""
Tests for the chat service
"""

import pytest
import asyncio
from app.services.chat_service import ChatService
from app.core.exceptions import ChatServiceError, ValidationError

class TestChatService:
    """Test cases for ChatService"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.chat_service = ChatService()
    
    @pytest.mark.asyncio
    async def test_process_valid_message(self):
        """Test processing a valid message"""
        message = "Hello, how are you?"
        response = await self.chat_service.process_message(message)
        
        assert isinstance(response, str)
        assert len(response) > 0
    
    @pytest.mark.asyncio
    async def test_process_empty_message(self):
        """Test processing an empty message"""
        with pytest.raises(ValidationError):
            await self.chat_service.process_message("")
    
    @pytest.mark.asyncio
    async def test_process_whitespace_message(self):
        """Test processing a whitespace-only message"""
        with pytest.raises(ValidationError):
            await self.chat_service.process_message("   ")
    
    @pytest.mark.asyncio
    async def test_process_long_message(self):
        """Test processing a message that's too long"""
        long_message = "a" * 1001
        with pytest.raises(ValidationError):
            await self.chat_service.process_message(long_message)
    
    @pytest.mark.asyncio
    async def test_greeting_response(self):
        """Test that greeting messages get appropriate responses"""
        greetings = ["Hello", "Hi there", "Hey", "Greetings"]
        
        for greeting in greetings:
            response = await self.chat_service.process_message(greeting)
            # Should contain greeting-related words
            assert any(word in response.lower() for word in ["hello", "hi", "greetings", "meet"])
    
    @pytest.mark.asyncio
    async def test_help_response(self):
        """Test that help requests get appropriate responses"""
        help_messages = ["Can you help me?", "I need assistance", "Help please"]
        
        for message in help_messages:
            response = await self.chat_service.process_message(message)
            # Should contain help-related words
            assert "help" in response.lower()
    
    @pytest.mark.asyncio
    async def test_thanks_response(self):
        """Test that thank you messages get appropriate responses"""
        thanks_messages = ["Thank you", "Thanks a lot", "I appreciate it"]
        
        for message in thanks_messages:
            response = await self.chat_service.process_message(message)
            # Should contain welcome-related words
            assert any(word in response.lower() for word in ["welcome", "glad", "happy"])
    
    @pytest.mark.asyncio
    async def test_goodbye_response(self):
        """Test that goodbye messages get appropriate responses"""
        goodbye_messages = ["Goodbye", "Bye", "See you later", "Farewell"]
        
        for message in goodbye_messages:
            response = await self.chat_service.process_message(message)
            # Should contain farewell-related words
            assert any(word in response.lower() for word in ["goodbye", "bye", "farewell", "take care", "see you"])
    
    @pytest.mark.asyncio
    async def test_question_response(self):
        """Test that questions get appropriate responses"""
        questions = ["What is the weather?", "How does this work?", "Why is the sky blue?"]
        
        for question in questions:
            response = await self.chat_service.process_message(question)
            assert len(response) > 0
    
    def test_conversation_context_update(self):
        """Test that conversation context is updated"""
        initial_length = len(self.chat_service.get_conversation_history())
        
        # Process a message (we'll mock this since it's async)
        self.chat_service._update_conversation_context("Hello", "Hi there!")
        
        history = self.chat_service.get_conversation_history()
        assert len(history) == initial_length + 1
        assert history[-1]["user"] == "Hello"
        assert history[-1]["assistant"] == "Hi there!"
    
    def test_conversation_context_limit(self):
        """Test that conversation context is limited to 10 exchanges"""
        # Add 15 exchanges
        for i in range(15):
            self.chat_service._update_conversation_context(f"Message {i}", f"Response {i}")
        
        history = self.chat_service.get_conversation_history()
        assert len(history) == 10
        # Should keep the most recent ones
        assert history[0]["user"] == "Message 5"
        assert history[-1]["user"] == "Message 14"
    
    def test_clear_conversation_history(self):
        """Test clearing conversation history"""
        # Add some exchanges
        self.chat_service._update_conversation_context("Hello", "Hi")
        self.chat_service._update_conversation_context("How are you?", "I'm good")
        
        assert len(self.chat_service.get_conversation_history()) == 2
        
        self.chat_service.clear_conversation_history()
        assert len(self.chat_service.get_conversation_history()) == 0
    
    def test_get_current_timestamp(self):
        """Test timestamp generation"""
        timestamp = self.chat_service.get_current_timestamp()
        assert isinstance(timestamp, str)
        assert timestamp.endswith("Z")  # Should be UTC format