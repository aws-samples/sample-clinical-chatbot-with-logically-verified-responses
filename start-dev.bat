@echo off
echo 🚀 Starting React Chatbot Development Environment
echo ==================================================

echo 📋 Checking prerequisites...

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Python is required but not installed.
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js and npm are required but not installed.
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed

echo.
echo 🐍 Starting FastAPI Backend...
cd backend

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo 📦 Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo 📦 Installing Python dependencies...
pip install -r requirements.txt

REM Start backend server
echo 🚀 Starting backend server on http://localhost:8000
start /b python run.py

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
echo.
echo ⚛️  Starting React Frontend...
cd ..\react-chatbot

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing Node.js dependencies...
    npm install
)

REM Start frontend server
echo 🚀 Starting frontend server on http://localhost:3000
start /b npm start

echo.
echo 🎉 Development environment is ready!
echo 📱 Frontend: http://localhost:3000
echo 🔧 Backend API: http://localhost:8000
echo 📚 API Docs: http://localhost:8000/docs
echo.
echo Press any key to stop all servers...
pause >nul

REM Cleanup
echo 🛑 Shutting down servers...
taskkill /f /im python.exe >nul 2>nul
taskkill /f /im node.exe >nul 2>nul
echo ✅ Cleanup complete