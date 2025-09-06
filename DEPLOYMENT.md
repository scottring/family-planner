# Itineraries - Production Deployment Guide

This guide will help you deploy your Itineraries application to production.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Docker installed (for containerized deployment)
- Domain name (for production)
- SSL certificates (for HTTPS)

### 1. Environment Setup

Copy the production environment template and update with your values:

```bash
cp server/.env.production server/.env
```

Update the following values in `server/.env`:

```bash
# Your production domain
CLIENT_URL=https://your-domain.com

# Generate a secure JWT secret (32+ characters)
JWT_SECRET=your-super-secure-jwt-secret-here

# Your API keys
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
OPENAI_API_KEY=your-openai-api-key
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### 2. Update Domain Configuration

Update the production domain in `server/index.js` line 18:
```javascript
: ['https://your-production-domain.com']
```

## 🐳 Docker Deployment (Recommended)

### Quick Deploy
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### Manual Docker Deployment
```bash
# Build the image
docker build -t itineraries .

# Run the container
docker run -d \
  --name itineraries-app \
  --restart unless-stopped \
  -p 8080:8080 \
  -v $(pwd)/database:/app/database \
  -v $(pwd)/logs:/app/logs \
  itineraries
```

## 🏗️ Manual Build & Deploy

### 1. Build the Application
```bash
chmod +x scripts/build.sh
./scripts/build.sh
```

### 2. Deploy to Your Server
- Copy all server files to your production server
- Ensure Node.js 18+ is installed
- Run: `npm start` in the server directory

## 🌐 Hosting Platform Deployment

### Railway
1. Connect your GitHub repository
2. Set environment variables in Railway dashboard
3. Deploy with one click

### Render
1. Connect your GitHub repository
2. Set build command: `cd client && npm run build`
3. Set start command: `cd server && npm start`
4. Set environment variables

### DigitalOcean App Platform
1. Create new app from GitHub
2. Configure build settings:
   - Build Command: `cd client && npm ci && npm run build`
   - Run Command: `cd server && npm ci && npm start`
3. Set environment variables

### Vercel (with external database)
1. Deploy frontend to Vercel
2. Deploy backend to Railway/Render
3. Update VITE_API_BASE_URL to backend URL

## 🗄️ Database Configuration

### SQLite (Default)
- Database file stored in `/database/itineraries.db`
- Automatically created on first run
- Suitable for small to medium applications

### PostgreSQL (Recommended for Production)
Update database configuration in `server/config/database.js`:

```javascript
// Replace SQLite with PostgreSQL
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
});
```

## 🔒 Security Checklist

- [ ] Generate secure JWT secret (minimum 32 characters)
- [ ] Enable HTTPS with SSL certificates
- [ ] Set up firewall rules
- [ ] Use environment variables for all secrets
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging
- [ ] Regular security updates

## 🔧 Environment Variables Reference

### Required Variables
```bash
NODE_ENV=production
PORT=8080
CLIENT_URL=https://your-domain.com
JWT_SECRET=your-secure-jwt-secret
```

### Optional API Keys
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
OPENAI_API_KEY=your-openai-api-key
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
OPENWEATHER_API_KEY=your-weather-api-key
```

## 📊 Monitoring & Maintenance

### Health Check
Your application includes a health check endpoint:
```
GET /api/health
```

### Logs
- Application logs: `/logs/combined.log`
- Error logs: `/logs/err.log`
- Output logs: `/logs/out.log`

### Database Backups
```bash
# SQLite backup
cp database/itineraries.db database/backup-$(date +%Y%m%d).db

# PostgreSQL backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

## 🔄 CI/CD Setup

### GitHub Actions Example
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Deploy to Railway
      run: railway deploy
```

## 🆘 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
lsof -ti:8080 | xargs kill -9
```

**Database Connection Failed**
- Check database file permissions
- Ensure database directory exists
- Verify DATABASE_PATH environment variable

**CORS Errors**
- Update CLIENT_URL environment variable
- Check allowed origins in server/index.js

**Build Failures**
- Clear node_modules and reinstall
- Check Node.js version compatibility
- Verify all environment variables are set

### Getting Help
- Check application logs in `/logs/`
- Use health check endpoint `/api/health`
- Enable debug mode: `DEBUG=* npm start`

## 🚀 Performance Optimization

### Production Optimizations
- Enable gzip compression (handled by nginx)
- Set up CDN for static assets
- Use PM2 for process management
- Enable database connection pooling
- Set up Redis for session storage (optional)

### Scaling Considerations
- Use load balancer for multiple instances
- Separate database server for high traffic
- Implement caching strategy
- Monitor resource usage

---

## 📞 Support

If you encounter issues during deployment:
1. Check the logs in `/logs/` directory
2. Verify all environment variables are set correctly
3. Ensure all required services (database, APIs) are accessible
4. Test the health check endpoint

For additional support, please refer to the application documentation or contact your development team.