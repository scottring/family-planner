#!/bin/bash

# Family Planner Production Start Script
echo "Starting Family Planner in production mode..."

# Set the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "PM2 is not installed. Please install it globally: npm install -g pm2"
    exit 1
fi

# Start the backend with PM2
echo "Starting backend server with PM2..."
pm2 start ecosystem.config.js

# Check if backend is running
sleep 3
if pm2 list | grep -q "family-planner.*online"; then
    echo "✓ Backend server started successfully"
    echo "✓ Server running on http://localhost:11001"
    echo "✓ Health check: http://localhost:11001/api/health"
    echo ""
    echo "To view logs: pm2 logs family-planner"
    echo "To stop: pm2 stop family-planner"
    echo "To restart: pm2 restart family-planner"
else
    echo "✗ Failed to start backend server"
    pm2 logs family-planner
    exit 1
fi

# Build and serve frontend (for production)
echo ""
echo "Building frontend for production..."
cd client
if npm run build; then
    echo "✓ Frontend built successfully"
    echo ""
    echo "To serve the built frontend, you can use a static server like:"
    echo "  npx serve -s dist -l 5173"
    echo "  or configure nginx/apache to serve the dist folder"
else
    echo "✗ Failed to build frontend"
    exit 1
fi

echo ""
echo "Family Planner production deployment completed!"