# React Chatbot with FastAPI Backend

A modern, accessible chatbot application built with React frontend and FastAPI backend. Features real-time messaging, comprehensive error handling, responsive design, and full accessibility support.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 16+ and npm
- **Python** 3.8+ and pip

### Easy Development Setup

#### Option 1: Automated Setup (Recommended)

**Linux/macOS:**
```bash
./start-dev.sh
```

**Windows:**
```batch
start-dev.bat
```

This will automatically:
- Set up Python virtual environment
- Install all dependencies
- Start both backend and frontend servers
- Open the application in your browser

#### Option 2: Manual Setup

**Backend Setup:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

**Frontend Setup:**
```bash
cd react-chatbot
npm install
npm start
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **Modern React** with hooks and functional components
- **TypeScript** for type safety
- **Comprehensive testing** with Vitest and Testing Library
- **Accessibility-first** design with ARIA support
- **Responsive design** for mobile and desktop
- **Error boundaries** and graceful error handling

### Backend (FastAPI + Python)
- **FastAPI** for high-performance API
- **Pydantic** for request/response validation
- **Async/await** for concurrent request handling
- **CORS support** for frontend integration
- **Comprehensive error handling** with proper HTTP status codes
- **API documentation** with OpenAPI/Swagger

## 🎯 Features

### Core Functionality
- ✅ Real-time chat messaging
- ✅ Contextual AI responses
- ✅ Message history and conversation flow
- ✅ Typing indicators
- ✅ Auto-scroll to latest messages
- ✅ Message retry functionality

### User Experience
- ✅ Responsive design (mobile-first)
- ✅ Smooth animations and transitions
- ✅ Loading states and feedback
- ✅ Error handling with user-friendly messages
- ✅ Keyboard shortcuts (Enter to send, Escape to clear)

### Accessibility
- ✅ Screen reader compatibility
- ✅ Keyboard navigation
- ✅ ARIA labels and roles
- ✅ Focus management
- ✅ High contrast support
- ✅ Semantic HTML structure

### Developer Experience
- ✅ TypeScript for type safety
- ✅ Comprehensive test coverage (146 tests)
- ✅ ESLint and code formatting
- ✅ Hot reload development
- ✅ API documentation
- ✅ Error logging and monitoring

## 🧪 Testing

### Frontend Tests
```bash
cd react-chatbot
npm test                    # Run all tests
npm run test:coverage      # Run with coverage report
```

### Backend Tests
```bash
cd backend
source venv/bin/activate   # Activate virtual environment
pytest                     # Run all tests
pytest --cov=app          # Run with coverage
```

### Test Coverage
- **Frontend**: 146 tests covering components, services, and integration
- **Backend**: Comprehensive API and service layer testing
- **Integration**: End-to-end testing of complete user flows

## 📁 Project Structure

```
├── react-chatbot/          # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API and business logic
│   │   ├── types/          # TypeScript type definitions
│   │   ├── styles/         # CSS styles
│   │   └── __tests__/      # Test files
│   └── package.json
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── main.py         # FastAPI application
│   │   ├── models.py       # Pydantic models
│   │   ├── services/       # Business logic
│   │   └── core/           # Core utilities
│   ├── tests/              # Backend tests
│   └── requirements.txt
├── start-dev.sh            # Development startup (Linux/macOS)
├── start-dev.bat           # Development startup (Windows)
└── README.md               # This file
```

## 🔧 Configuration

### Frontend Configuration
The React app can be configured to use either mock responses or the real backend:

```typescript
// In react-chatbot/src/services/ChatService.ts
export const chatService = new ChatService({
  apiUrl: 'http://localhost:8000',
  useMockResponses: false, // Set to true for testing without backend
});
```

### Backend Configuration
Copy `.env.example` to `.env` in the backend directory and modify as needed:

```bash
cd backend
cp .env.example .env
```

## 🚀 Deployment

### Frontend Deployment
```bash
cd react-chatbot
npm run build
# Deploy the 'build' folder to your hosting service
```

### Backend Deployment
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

For production, consider using:
- **Gunicorn** for the Python backend
- **Nginx** as a reverse proxy
- **Docker** for containerization
- **Environment variables** for configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test` and `pytest`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📝 API Documentation

Once the backend is running, visit http://localhost:8000/docs for interactive API documentation.

### Key Endpoints

- `POST /api/chat` - Send a message to the chatbot
- `GET /health` - Health check endpoint
- `GET /` - Basic status endpoint

## 🐛 Troubleshooting

### Common Issues

**Backend won't start:**
- Ensure Python 3.8+ is installed
- Check if port 8000 is available
- Verify virtual environment is activated

**Frontend won't start:**
- Ensure Node.js 16+ is installed
- Check if port 3000 is available
- Try deleting `node_modules` and running `npm install`

**CORS errors:**
- Ensure backend is running on port 8000
- Check CORS configuration in `backend/app/main.py`

**Tests failing:**
- Ensure all dependencies are installed
- Check if backend is running for integration tests

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [React](https://reactjs.org/) and [FastAPI](https://fastapi.tiangolo.com/)
- Testing with [Vitest](https://vitest.dev/) and [pytest](https://pytest.org/)
- UI components follow [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/) accessibility guidelines