"""
Tests for the chat API endpoints
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

class TestChatAPI:
    """Test cases for chat API endpoints"""
    
    def test_health_check(self):
        """Test the health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "service" in data
        assert "version" in data
    
    def test_root_endpoint(self):
        """Test the root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["status"] == "healthy"
    
    def test_send_message_success(self):
        """Test successful message sending"""
        request_data = {"message": "Hello, how are you?"}
        response = client.post("/api/chat", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "timestamp" in data
        assert len(data["message"]) > 0
    
    def test_send_empty_message(self):
        """Test sending an empty message"""
        request_data = {"message": ""}
        response = client.post("/api/chat", json=request_data)
        
        assert response.status_code == 422  # Validation error
    
    def test_send_whitespace_message(self):
        """Test sending a whitespace-only message"""
        request_data = {"message": "   "}
        response = client.post("/api/chat", json=request_data)
        
        assert response.status_code == 422  # Validation error
    
    def test_send_long_message(self):
        """Test sending a message that's too long"""
        long_message = "a" * 1001  # Exceeds 1000 character limit
        request_data = {"message": long_message}
        response = client.post("/api/chat", json=request_data)
        
        assert response.status_code == 422  # Validation error
    
    def test_send_greeting_message(self):
        """Test sending a greeting message"""
        request_data = {"message": "Hello there!"}
        response = client.post("/api/chat", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        # Should contain greeting-related response
        assert any(word in data["message"].lower() for word in ["hello", "hi", "greetings"])
    
    def test_send_help_message(self):
        """Test sending a help request"""
        request_data = {"message": "Can you help me?"}
        response = client.post("/api/chat", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        # Should contain help-related response
        assert "help" in data["message"].lower()
    
    def test_send_question_message(self):
        """Test sending a question"""
        request_data = {"message": "What is the weather like?"}
        response = client.post("/api/chat", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["message"]) > 0
    
    def test_invalid_request_format(self):
        """Test sending invalid request format"""
        response = client.post("/api/chat", json={"invalid": "data"})
        
        assert response.status_code == 422  # Validation error
    
    def test_missing_message_field(self):
        """Test request missing message field"""
        response = client.post("/api/chat", json={})
        
        assert response.status_code == 422  # Validation error