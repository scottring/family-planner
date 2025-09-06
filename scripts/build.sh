#!/bin/bash

# Itineraries - Production Build Script
# This script builds the frontend and prepares the application for production deployment

set -e  # Exit on any error

echo "🏗️  Starting production build..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -f "client/package.json" ]; then
    echo -e "${RED}❌ Error: Not in project root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Installing server dependencies...${NC}"
cd server
npm ci --only=production
cd ..

echo -e "${YELLOW}📦 Installing client dependencies...${NC}"
cd client
npm ci

echo -e "${YELLOW}🏗️  Building React frontend...${NC}"
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Error: Frontend build failed - dist directory not found${NC}"
    exit 1
fi

cd ..

echo -e "${YELLOW}🧹 Cleaning up development files...${NC}"
# Remove development node_modules from client after build
rm -rf client/node_modules/.cache

echo -e "${GREEN}✅ Production build completed successfully!${NC}"
echo -e "${GREEN}📁 Built files are in client/dist/${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Copy server/.env.production to server/.env and update with your values"
echo "2. Deploy using Docker: docker build -t family-planner ."
echo "3. Or deploy to your hosting platform"