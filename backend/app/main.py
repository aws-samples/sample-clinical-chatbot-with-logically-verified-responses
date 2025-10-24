"""
FastAPI backend for React Chatbot
Provides chat API endpoints with proper error handling and CORS support
"""

import logging
import traceback
import sys
import os
import json
from contextlib import redirect_stdout, redirect_stderr
from io import StringIO

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import uvicorn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from .models import ChatRequest, ChatResponse, FactsResponse, AxiomsResponse
from .services.chat_service import ChatService
from .core.exceptions import ChatServiceError

# Add the root directory to Python path (go up from backend/app/ to root)
root_dir = os.path.join(os.path.dirname(__file__), '..', '..')
sys.path.insert(0, root_dir)

from interface import get_facts_nat_lang, process_user_response, get_axioms_as_str, process_user_response_streaming
logger.info("Successfully imported full interface module with AI agents")

# Create FastAPI app
app = FastAPI(
    title="React Chatbot API",
    description="Backend API for the React Chatbot application",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for debugging
    allow_credentials=False,  # Set to False when using allow_origins=["*"]
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"])

chat_service = ChatService()

@app.get("/")
async def root():
    """ Health check endpoint """
    return {"message": "React Chatbot API is running", "status": "healthy"}


@app.get("/health")
async def health_check():
    """ Detailed health check endpoint """
    return {
        "status": "healthy",
        "service": "react-chatbot-api",
        "version": "1.0.0"
    }


@app.get("/api/facts", response_model=FactsResponse)
async def get_facts():
    """
    Get theorem prover facts in natural language
    
    Returns:
        FactsResponse with list of facts and timestamp
        
    Raises:
        HTTPException: If facts cannot be retrieved
    """
    try:
        logger.info("Fetching theorem prover facts...")
        facts = get_facts_nat_lang()
        logger.info("Retrieved %s facts", len(facts))
        return FactsResponse(
            facts=facts,
            timestamp=chat_service.get_current_timestamp())
        
    except Exception as e:
        logger.error("Error fetching facts: %s", e)
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "FACTS_ERROR",
                "message": "Could not retrieve theorem prover facts",
                "retryable": True
            }) from e


@app.get("/api/axioms", response_model=AxiomsResponse)
async def get_axioms():
    """
    Get theorem prover axioms
    
    Returns:
        AxiomsResponse with list of axioms and timestamp
        
    Raises:
        HTTPException: If axioms cannot be retrieved
    """
    try:
        logger.info("Fetching theorem prover axioms...")
        axioms = get_axioms_as_str()
        logger.info("Retrieved %s axioms", len(axioms))
        for i, axiom in enumerate(axioms):
            logger.info("Axiom %s: %s", i, axiom)
        return AxiomsResponse(
            axioms=axioms,
            timestamp=chat_service.get_current_timestamp())
    except Exception as e:
        logger.error("Error fetching axioms: %s", e)
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "AXIOMS_ERROR",
                "message": "Could not retrieve theorem prover axioms",
                "retryable": True
            }
        ) from e


@app.post("/api/chat", response_model=ChatResponse)
async def send_message(request: ChatRequest):
    """
    Send a message to the chatbot and get a response
    
    Args:
        request: ChatRequest containing the user message
        
    Returns:
        ChatResponse with the assistant's reply and theorem prover information
        
    Raises:
        HTTPException: For various error conditions
    """
    try:
        logger.info("Received chat request: %s...", request.message[:50])
        # Process the message using the theorem prover interface directly
        logger.info("Attempting to use theorem prover interface with do_corrupt=%s",
                    request.do_corrupt)
        response_obj = process_user_response(request.message, do_corrupt=request.do_corrupt)
        logger.info("✅ Theorem prover response: %s",
                    response_obj.assistant_response[:50])
        
        return ChatResponse(
            message=response_obj.assistant_response,
            timestamp=chat_service.get_current_timestamp(),
            corrupted_response=response_obj.corrupted_response if response_obj.corrupted_response != response_obj.assistant_response else None,
            extracted_logical_stmt=response_obj.extracted_logical_stmt,
            validity=response_obj.valid,
            processing_durations=response_obj.durations)
    except ChatServiceError as e:
        logger.error("Chat service error: %s", e)
        
        # Map internal errors to HTTP status codes
        status_code = status.HTTP_400_BAD_REQUEST
        if e.error_code == "NETWORK_ERROR":
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        elif e.error_code == "TIMEOUT_ERROR":
            status_code = status.HTTP_408_REQUEST_TIMEOUT
        elif e.error_code in ["EMPTY_MESSAGE", "MESSAGE_TOO_LONG"]:
            status_code = status.HTTP_400_BAD_REQUEST
        
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.error_code,
                "message": str(e),
                "retryable": e.retryable
            }) from e
        
    except Exception as e:
        logger.error("Unexpected error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "retryable": True
            }) from e

@app.post("/api/chat/stream")
async def send_message_stream(request: ChatRequest):
    """
    Send a message to the chatbot and get a streaming response
    
    Args:
        request: ChatRequest containing the user message
        
    Returns:
        StreamingResponse with Server-Sent Events containing progressive updates
        
    Raises:
        HTTPException: For various error conditions
    """
    try:
        logger.info("Received streaming chat request: %s...",
                    request.message[:50])
        
        def generate_stream():
            """Generator function for Server-Sent Events"""
            try:
                logger.info("Using theorem prover interface for streaming...")
                # Suppress stdout/stderr to prevent debug output from leaking
                # Use the streaming function from interface with suppressed output
                with redirect_stdout(StringIO()), redirect_stderr(StringIO()):
                    logger.info("about to call process_user_response_streaming with do_corrupt=%s",
                                request.do_corrupt)
                    for idx, event_obj in enumerate(process_user_response_streaming(
                                                                request.message, 
                                                                do_corrupt=request.do_corrupt)):
                        logger.info("%s>>>>> %s", idx, event_obj)

                        # Helper function to safely get JSON-serializable values
                        def safe_getattr(obj, attr, default=None):
                            value = getattr(obj, attr, default)
                            # Skip functions and other non-serializable objects
                            if callable(value):
                                return default
                            return value

                        # Handle different event types
                        if hasattr(event_obj, 'message') and not hasattr(event_obj, 'assistant_response'):
                            # This is a ProgressUpdate event
                            streaming_response = {
                                "type": "progress",
                                "message": safe_getattr(event_obj, 'message', ''),
                                "timestamp": chat_service.get_current_timestamp(),
                                "is_final": safe_getattr(event_obj, 'is_final', False)
                            }
                        else:
                            # This is a FinalSummary event
                            streaming_response = {
                                "type": "final",
                                "assistant_response": safe_getattr(event_obj, 'assistant_response', None),
                                "corrupted_response": safe_getattr(event_obj, 'corrupted_response', None),
                                "extracted_logical_stmt": safe_getattr(event_obj, 'extracted_logical_stmt', None),
                                "durations": safe_getattr(event_obj, 'durations', None),
                                "valid": safe_getattr(event_obj, 'valid', None),
                                "original_result": safe_getattr(event_obj, 'original_result', None),
                                "negated_result": safe_getattr(event_obj, 'negated_result', None),
                                "error_messages": safe_getattr(event_obj, 'error_messages', None),
                                "progress_messages": safe_getattr(event_obj, 'progress_messages', None),
                                "timestamp": chat_service.get_current_timestamp(),
                                "is_final": safe_getattr(event_obj, 'is_final', True)
                            }
                        
                        # Send as Server-Sent Event
                        data = json.dumps(streaming_response)
                        yield f"data: {data}\n\n"
            except Exception as e:
                logger.error("Error in streaming generator: %s", e)
                logger.error("Full traceback: %s", traceback.format_exc())
                error_response = {
                    "type": "final",
                    "assistant_response": "An error occurred while processing your request.",
                    "timestamp": chat_service.get_current_timestamp(),
                    "is_final": True
                }
                yield f"data: {json.dumps(error_response)}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "text/event-stream",
            })
        
    except Exception as e:
        logger.error("Unexpected error in streaming endpoint: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "retryable": True
            }) from e

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    """Custom HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.detail)


@app.exception_handler(Exception)
async def general_exception_handler(request, exc: Exception):
    """General exception handler for unhandled errors"""
    logger.error("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "INTERNAL_ERROR",
            "message": "An unexpected error occurred",
            "retryable": True
        })

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)