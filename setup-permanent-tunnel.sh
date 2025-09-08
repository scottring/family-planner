#!/bin/bash

echo "🔐 Setting up Permanent Cloudflare Tunnel for Itineraries"
echo "========================================================="
echo ""

# Step 1: Login to Cloudflare
echo "Step 1: Logging into Cloudflare..."
echo "A browser window will open for authentication."
echo ""
cloudflared tunnel login

if [ $? -ne 0 ]; then
    echo "❌ Login failed. Please try again."
    exit 1
fi

echo ""
echo "✅ Login successful!"
echo ""

# Step 2: Create a named tunnel
TUNNEL_NAME="itineraries-backend"
echo "Step 2: Creating named tunnel '$TUNNEL_NAME'..."
cloudflared tunnel create $TUNNEL_NAME

if [ $? -ne 0 ]; then
    echo "⚠️  Tunnel might already exist. Continuing..."
fi

echo ""

# Step 3: Get tunnel info
echo "Step 3: Getting tunnel information..."
TUNNEL_ID=$(cloudflared tunnel list | grep $TUNNEL_NAME | awk '{print $1}')

if [ -z "$TUNNEL_ID" ]; then
    echo "❌ Could not find tunnel ID. Please check tunnel list:"
    cloudflared tunnel list
    exit 1
fi

echo "Tunnel ID: $TUNNEL_ID"
echo ""

# Step 4: Create config file
CONFIG_DIR="$HOME/.cloudflared"
CONFIG_FILE="$CONFIG_DIR/config.yml"

echo "Step 4: Creating configuration file..."
mkdir -p $CONFIG_DIR

cat > $CONFIG_FILE << EOF
tunnel: $TUNNEL_ID
credentials-file: $CONFIG_DIR/$TUNNEL_ID.json

ingress:
  - hostname: api.itineraries.yourdomain.com
    service: http://localhost:11001
  - service: http_status:404
EOF

echo "Configuration saved to: $CONFIG_FILE"
echo ""

# Step 5: Instructions for DNS setup
echo "📋 Next Steps:"
echo "=============="
echo ""
echo "1. Choose your subdomain (e.g., 'api.yourdomain.com' or 'itineraries-api.yourdomain.com')"
echo ""
echo "2. Add a CNAME record in your Cloudflare DNS:"
echo "   Name: api (or your chosen subdomain)"
echo "   Target: $TUNNEL_ID.cfargotunnel.com"
echo ""
echo "3. Update the config file with your domain:"
echo "   Edit: $CONFIG_FILE"
echo "   Change: api.itineraries.yourdomain.com to your actual domain"
echo ""
echo "4. Run the tunnel:"
echo "   cloudflared tunnel run $TUNNEL_NAME"
echo ""
echo "5. Update your app's .env.production:"
echo "   VITE_API_BASE_URL=https://api.yourdomain.com/api"
echo ""
echo "Optional: Set up as a service to run automatically:"
echo "   sudo cloudflared service install"
echo "   sudo cloudflared service start"
echo ""
echo "🎉 Your permanent tunnel is ready to configure!"