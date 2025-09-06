#!/bin/bash

# Itineraries - Docker Deployment Script
# This script builds and deploys the application using Docker

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="itineraries"
CONTAINER_NAME="itineraries-app"
PORT=${PORT:-8080}

echo -e "${BLUE}🚀 Itineraries Deployment Script${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Error: Docker is not installed${NC}"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "Dockerfile" ]; then
    echo -e "${RED}❌ Error: Dockerfile not found. Run from project root directory.${NC}"
    exit 1
fi

# Check if environment file exists
if [ ! -f "server/.env" ]; then
    echo -e "${YELLOW}⚠️  Warning: server/.env not found${NC}"
    echo "Please copy server/.env.production to server/.env and update with your values"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${YELLOW}🛑 Stopping existing container...${NC}"
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

echo -e "${YELLOW}🏗️  Building Docker image...${NC}"
docker build -t $IMAGE_NAME .

echo -e "${YELLOW}🚀 Starting new container...${NC}"
docker run -d \
    --name $CONTAINER_NAME \
    --restart unless-stopped \
    -p $PORT:8080 \
    -v $(pwd)/database:/app/database \
    -v $(pwd)/logs:/app/logs \
    $IMAGE_NAME

# Wait for container to start
echo -e "${YELLOW}⏳ Waiting for container to start...${NC}"
sleep 5

# Check if container is running
if docker ps | grep -q $CONTAINER_NAME; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo -e "${GREEN}🌐 Application is running at: http://localhost:$PORT${NC}"
    echo -e "${GREEN}🏥 Health check: http://localhost:$PORT/api/health${NC}"
    echo ""
    echo "To view logs: docker logs $CONTAINER_NAME"
    echo "To stop: docker stop $CONTAINER_NAME"
else
    echo -e "${RED}❌ Deployment failed - container is not running${NC}"
    echo "Check logs: docker logs $CONTAINER_NAME"
    exit 1
fi