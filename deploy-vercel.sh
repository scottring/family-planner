#!/bin/bash

# Itineraries - Vercel Frontend Deployment Script

echo "🚀 Deploying Itineraries frontend to Vercel..."

# Navigate to client directory
cd client

# Deploy to Vercel production
echo "📦 Building and deploying to Vercel..."
npx vercel --prod --yes \
  --name itineraries \
  --build-env VITE_API_BASE_URL="https://rare-radiance-production.up.railway.app/api" \
  --env VITE_API_BASE_URL="https://rare-radiance-production.up.railway.app/api"

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Update your Railway backend environment variable:"
echo "   CLIENT_URL=https://itineraries.vercel.app"
echo ""
echo "2. Test your deployment:"
echo "   - Frontend: https://itineraries.vercel.app"
echo "   - Backend health: https://rare-radiance-production.up.railway.app/api/health"