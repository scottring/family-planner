# Setting Up Permanent Cloudflare Tunnel

## Step 1: Complete Authentication

1. Open this URL in your browser:
   ```
   https://dash.cloudflare.com/argotunnel
   ```

2. Log in or create a free Cloudflare account

3. Select a domain (or use a free one from Cloudflare)

4. Once authorized, return to the terminal

## Step 2: After Authentication

Run these commands in order:

```bash
# 1. Check if certificate was created
ls -la ~/.cloudflared/cert.pem

# 2. If cert.pem exists, create the tunnel
cloudflared tunnel create itineraries-backend

# 3. Create config file
cat > ~/.cloudflared/config.yml << EOF
url: http://localhost:11001
tunnel: itineraries-backend
credentials-file: ~/.cloudflared/<TUNNEL_ID>.json
EOF

# 4. Route traffic to your tunnel (replace YOUR_DOMAIN.com)
cloudflared tunnel route dns itineraries-backend itineraries.YOUR_DOMAIN.com

# 5. Run the tunnel
cloudflared tunnel run itineraries-backend
```

## Step 3: Update Your App

Once you have your permanent URL (like `itineraries.yourdomain.com`), update:

1. `client/.env.production`:
   ```
   VITE_API_BASE_URL=https://itineraries.yourdomain.com
   ```

2. Redeploy to Vercel:
   ```bash
   cd client && npx vercel --prod
   ```

## Step 4: Keep Tunnel Running

To keep the tunnel running permanently on your Mac mini:

```bash
# Install as a service
cloudflared service install

# Or use PM2
pm2 start "cloudflared tunnel run itineraries-backend" --name cloudflare-tunnel
pm2 save
```

## Alternative: Use Cloudflare Zero Trust Dashboard

1. Go to https://one.dash.cloudflare.com/
2. Navigate to Networks > Tunnels
3. Create a tunnel through the UI
4. Follow the installation instructions for macOS

This gives you a permanent subdomain like:
- `itineraries.yourdomain.com` (if you have a domain)
- Or use a Cloudflare-provided subdomain

## Benefits of Named Tunnel:
- Permanent URL that never changes
- Can be managed from Cloudflare dashboard
- Better security with tunnel credentials
- Can set up multiple routes and services
- Works even after Mac mini restarts