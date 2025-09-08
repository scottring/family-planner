# Itineraries Deployment Guide

## 🌐 Permanent URL
Your app is always accessible at: **https://itineraries-jet.vercel.app**

This URL never changes, regardless of how many times you deploy.

## 🚀 How to Deploy

### Simple Deployment (Recommended)
```bash
./deploy.sh
```

### Manual Deployment
```bash
cd client
npm run build
vercel --prod --yes
```

## 📝 Important
- Always use: **https://itineraries-jet.vercel.app**
- Backend runs on PM2 (port 11001)
- Tunnel URL in client/.env.production
