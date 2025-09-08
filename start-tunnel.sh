#!/bin/bash

# Cloudflare Tunnel Starter Script
# This creates a consistent tunnel URL for the backend

echo "🌐 Starting Cloudflare tunnel for Itineraries backend..."
echo ""

# Kill any existing cloudflared processes for port 11001
echo "🔄 Cleaning up existing tunnels..."
pkill -f "cloudflared.*11001" 2>/dev/null

sleep 2

# Start a new tunnel
echo "🚇 Starting new tunnel..."
cloudflared tunnel --url http://localhost:11001 &

# Wait for tunnel to establish
sleep 5

# Get the tunnel URL
echo ""
echo "✅ Tunnel started!"
echo ""
echo "📝 The tunnel URL will be displayed above."
echo "   Copy this URL and update it in client/.env.production"
echo ""
echo "💡 Tip: For a permanent URL, consider setting up a named Cloudflare tunnel"
echo "   with your own domain (free with Cloudflare account)"