#!/bin/bash

# Permanent Cloudflare Tunnel Runner for Itineraries Backend
# This uses the configured named tunnel with a permanent URL

echo "🚇 Starting Itineraries Backend Tunnel"
echo "======================================"
echo ""

# Check if backend is running
if ! lsof -Pi :11001 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Warning: Backend server not detected on port 11001"
    echo "   Make sure to run 'npm run server' in a separate terminal"
    echo ""
fi

# Kill any existing cloudflared processes
echo "🔄 Cleaning up existing tunnels..."
pkill -f "cloudflared tunnel run" 2>/dev/null

sleep 2

# Start the named tunnel
echo "🌐 Starting tunnel: itineraries-backend"
echo "📍 URL: https://itineraries-backend.symphony-os.com"
echo ""

# Run tunnel using local config
cloudflared tunnel --config .cloudflared/config.yml run itineraries-backend &

TUNNEL_PID=$!

echo "✅ Tunnel started with PID: $TUNNEL_PID"
echo ""
echo "🔗 Your backend is now accessible at:"
echo "   https://itineraries-backend.symphony-os.com/api"
echo ""
echo "📝 This URL is permanent and won't change between restarts"
echo ""
echo "Press Ctrl+C to stop the tunnel"

# Wait for interrupt
trap "echo ''; echo '🛑 Stopping tunnel...'; kill $TUNNEL_PID 2>/dev/null; exit 0" INT

# Keep script running
wait $TUNNEL_PID