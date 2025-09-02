#!/bin/bash

# Family Planner Development Start Script
echo "Starting Family Planner in development mode..."

# Set the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "Shutting down development servers..."
    if [[ -n $BACKEND_PID ]]; then
        kill $BACKEND_PID 2>/dev/null
        echo "✓ Backend server stopped"
    fi
    if [[ -n $FRONTEND_PID ]]; then
        kill $FRONTEND_PID 2>/dev/null
        echo "✓ Frontend dev server stopped"
    fi
    exit 0
}

# Setup signal handlers
trap cleanup SIGINT SIGTERM

# Check if required dependencies are installed
echo "Checking dependencies..."

# Check backend dependencies
cd server
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

# Check frontend dependencies
cd ../client
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

cd "$SCRIPT_DIR"

# Start backend in development mode
echo ""
echo "Starting backend server in development mode..."
cd server
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 3

# Check if backend is running
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo "✓ Backend server started on http://localhost:11001"
    echo "✓ Health check: http://localhost:11001/api/health"
else
    echo "✗ Failed to start backend server"
    exit 1
fi

# Start frontend dev server
echo ""
echo "Starting frontend dev server..."
cd ../client
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 3

# Check if frontend is running
if kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "✓ Frontend dev server started on http://localhost:5173"
else
    echo "✗ Failed to start frontend dev server"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🚀 Family Planner development environment is ready!"
echo ""
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:11001"
echo "API Health Check: http://localhost:11001/api/health"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user to stop the script
wait