"""
Custom exceptions for the chat service
"""

class ChatServiceError(Exception):
    """Base exception for chat service errors"""
    
    def __init__(self, message: str, error_code: str, retryable: bool = False):
        super().__init__(message)
        self.error_code = error_code
        self.retryable = retryable
        self.message = message

class ValidationError(ChatServiceError):
    """Raised when input validation fails"""
    
    def __init__(self, message: str):
        super().__init__(message, "VALIDATION_ERROR", False)

class NetworkError(ChatServiceError):
    """Raised when network operations fail"""
    
    def __init__(self, message: str = "Network connection failed"):
        super().__init__(message, "NETWORK_ERROR", True)

class TimeoutError(ChatServiceError):
    """Raised when operations timeout"""
    
    def __init__(self, message: str = "Request timed out"):
        super().__init__(message, "TIMEOUT_ERROR", True)

class ServiceUnavailableError(ChatServiceError):
    """Raised when the service is temporarily unavailable"""
    
    def __init__(self, message: str = "Service temporarily unavailable"):
        super().__init__(message, "SERVICE_UNAVAILABLE", True)