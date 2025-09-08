#!/bin/bash

# Planning Workflow Test Runner
# This script runs the comprehensive test suite and generates reports

echo "🧪 Weekly Planning Workflow Test Suite"
echo "======================================"
echo ""

# Check if server is running
echo "📡 Checking server status..."
if curl -s http://localhost:11001/api/health > /dev/null; then
    echo "✅ Server is running"
else
    echo "❌ Server is not running. Please start the server first."
    exit 1
fi

# Install test dependencies if needed
echo "📦 Checking test dependencies..."
cd "$(dirname "$0")/.."
npm list axios socket.io-client > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Installing test dependencies..."
    npm install --save-dev axios socket.io-client
fi

# Run the test suite
echo ""
echo "🚀 Running test suite..."
echo ""
node test/planning-workflow-test-suite.js

# Check test results
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Test suite completed successfully"
else
    echo ""
    echo "⚠️  Test suite completed with errors"
fi

echo ""
echo "📊 Check the generated test report for detailed results"