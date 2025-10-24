"""
Pydantic models for API request/response validation
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List

class ChatRequest(BaseModel):
    """Request model for chat messages"""
    message: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="The user's message to send to the chatbot"
    )
    do_corrupt: bool = Field(
        default=False,
        description="Whether to enable response corruption for testing validation"
    )
    
    @field_validator('message')
    @classmethod
    def validate_message(cls, v):
        """Validate message content"""
        if not v or not v.strip():
            raise ValueError('Message cannot be empty or whitespace only')
        return v.strip()

class ChatResponse(BaseModel):
    """Response model for chat messages"""
    message: str = Field(
        ...,
        description="The chatbot's response message"
    )
    timestamp: str = Field(
        ...,
        description="ISO timestamp when the response was generated"
    )
    # Optional theorem prover information
    corrupted_response: Optional[str] = Field(
        default=None,
        description="The corrupted version of the response (if corruption was applied)"
    )
    extracted_logical_stmt: Optional[str] = Field(
        default=None,
        description="The logical statement extracted from the response"
    )
    validity: Optional[str] = Field(
        default=None,
        description="Whether the extracted statement is valid (true/false/unknown)"
    )
    processing_durations: Optional[dict] = Field(
        default=None,
        description="Time taken for different processing steps"
    )

class FactsResponse(BaseModel):
    """Response model for theorem prover facts"""
    facts: List[str] = Field(
        ...,
        description="List of natural language facts from the theorem prover"
    )
    timestamp: str = Field(
        ...,
        description="ISO timestamp when the facts were generated"
    )

class AxiomsResponse(BaseModel):
    """Response model for theorem prover axioms"""
    axioms: List[str] = Field(
        ...,
        description="List of axioms from the theorem prover"
    )
    timestamp: str = Field(
        ...,
        description="ISO timestamp when the axioms were generated"
    )

class StreamingChatResponse(BaseModel):
    """Streaming response model for progressive chat updates"""
    assistant_response: Optional[str] = Field(
        default=None,
        description="The assistant's response message"
    )
    corrupted_response: Optional[str] = Field(
        default=None,
        description="The corrupted version of the response (if corruption was applied)"
    )
    extracted_logical_stmt: Optional[str] = Field(
        default=None,
        description="The logical statement extracted from the response"
    )
    durations: Optional[dict] = Field(
        default=None,
        description="Time taken for different processing steps"
    )
    valid: Optional[str] = Field(
        default=None,
        description="Whether the extracted statement is valid (true/false/unknown)"
    )
    original_result: Optional[str] = Field(
        default=None,
        description="Original theorem prover result"
    )
    negated_result: Optional[str] = Field(
        default=None,
        description="Negated theorem prover result"
    )
    error_messages: Optional[List[str]] = Field(
        default=None,
        description="List of error messages from processing"
    )
    progress_messages: Optional[List[str]] = Field(
        default=None,
        description="List of progress messages from processing"
    )
    timestamp: str = Field(
        ...,
        description="ISO timestamp when this update was generated"
    )
    is_final: bool = Field(
        default=False,
        description="Whether this is the final update in the stream"
    )

class ErrorResponse(BaseModel):
    """Error response model"""
    error: str = Field(
        ...,
        description="Error code identifying the type of error"
    )
    message: str = Field(
        ...,
        description="Human-readable error message"
    )
    retryable: bool = Field(
        default=False,
        description="Whether the request can be retried"
    )
    timestamp: Optional[str] = Field(
        default=None,
        description="ISO timestamp when the error occurred"
    )