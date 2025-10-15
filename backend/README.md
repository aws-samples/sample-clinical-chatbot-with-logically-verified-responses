# React Chatbot Backend

A FastAPI-based backend service for the React Chatbot application.

## Features

- **RESTful API** with FastAPI
- **Input validation** using Pydantic models
- **Error handling** with proper HTTP status codes
- **CORS support** for frontend integration
- **Contextual responses** based on message content
- **Conversation history** tracking
- **Comprehensive testing** with pytest
- **API documentation** with Swagger/OpenAPI

## Quick Start

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

### Running the Server

#### Development Mode
```bash
python run.py
```

#### Production Mode
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The server will start on `http://localhost:8000`

### API Documentation

Once the server is running, you can access:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Health Check
- **GET** `/` - Basic health check
- **GET** `/health` - Detailed health information

### Chat API
- **POST** `/api/chat` - Send a message to the chatbot

#### Request Format
```json
{
  "message": "Hello, how are you?"
}
```

#### Response Format
```json
{
  "message": "Hello! It's great to meet you. How can I assist you today?",
  "timestamp": "2023-12-07T10:30:00.000Z"
}
```

#### Error Response Format
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Message cannot be empty",
  "retryable": false
}
```

## Testing

Run the test suite:
```bash
pytest
```

Run tests with coverage:
```bash
pytest --cov=app
```

## Error Codes

The API returns specific error codes for different scenarios:

- `VALIDATION_ERROR` - Input validation failed (400)
- `NETWORK_ERROR` - Simulated network failure (503)
- `TIMEOUT_ERROR` - Request timeout (408)
- `PROCESSING_ERROR` - Unexpected processing error (500)
- `INTERNAL_ERROR` - General server error (500)

## Configuration

Copy `.env.example` to `.env` and modify as needed:

```bash
cp .env.example .env
```

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── models.py            # Pydantic models
│   ├── core/
│   │   ├── __init__.py
│   │   └── exceptions.py    # Custom exceptions
│   └── services/
│       ├── __init__.py
│       └── chat_service.py  # Chat processing logic
├── tests/
│   ├── __init__.py
│   ├── test_chat_api.py     # API endpoint tests
│   └── test_chat_service.py # Service layer tests
├── requirements.txt         # Python dependencies
├── pytest.ini             # Pytest configuration
├── run.py                  # Development server script
└── README.md              # This file
```

## Integration with Frontend

The backend is configured to work with the React frontend running on:
- `http://localhost:3000` (Create React App)
- `http://localhost:5173` (Vite)

CORS is properly configured to allow requests from these origins.

## Development

### Adding New Features

1. Add new endpoints in `app/main.py`
2. Create corresponding Pydantic models in `app/models.py`
3. Implement business logic in appropriate service files
4. Add tests for new functionality
5. Update API documentation

### Code Style

The project follows Python best practices:
- Type hints for better code clarity
- Comprehensive error handling
- Proper logging
- Clean separation of concerns
- Comprehensive testing

## Deployment

For production deployment, consider:
- Using a production WSGI server like Gunicorn
- Setting up proper environment variables
- Configuring logging for production
- Setting up monitoring and health checks
- Using a reverse proxy like Nginx