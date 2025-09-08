#!/bin/bash

# Itineraries Deployment Script
# This script ensures consistent deployment to the permanent production URL

echo "🚀 Starting Itineraries deployment..."
echo ""

# Navigate to client directory
cd "$(dirname "$0")/client" || exit 1

# Build the application
echo "📦 Building the application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors and try again."
    exit 1
fi

echo ""
echo "☁️  Deploying to Vercel..."

# Deploy to production (--yes flag ensures it updates the same production deployment)
vercel --prod --yes

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "🌐 Your app is live at: https://itineraries-jet.vercel.app"
    echo ""
    echo "📝 Note: This URL never changes - it always points to your latest production deployment"
else
    echo ""
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi