# IMPORTANT: Update Your Cloudflare URL

To fix the login issue on production:

1. Find your Cloudflare tunnel URL:
   - Look at the terminal where you ran: `cloudflared tunnel --url http://localhost:11001`
   - You'll see a URL like: `https://xxxxx-xxxxx-xxxxx.trycloudflare.com`

2. Update the file `client/.env.production`:
   - Replace `https://your-backend.trycloudflare.com` with your actual Cloudflare URL

3. Redeploy to Vercel:
   ```bash
   cd client
   npx vercel --prod
   ```

The Cloudflare URL changes each time you restart the tunnel, so you'll need to update this whenever you restart your backend.

For a permanent solution, consider using a fixed subdomain with Cloudflare Tunnel (requires Cloudflare account).