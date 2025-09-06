# Itineraries Production Dockerfile
# Multi-stage build for optimal production deployment

# Stage 1: Build React frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --only=production
COPY client/ .
RUN npm run build

# Stage 2: Setup Node.js backend
FROM node:18-alpine AS backend-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --only=production

# Stage 3: Production runtime
FROM node:18-alpine AS runtime
WORKDIR /app

# Install production dependencies
COPY server/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy server source code
COPY server/ .

# Copy built frontend from first stage
COPY --from=frontend-builder /app/client/dist ./client/dist

# Create directory for database and logs
RUN mkdir -p database logs

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001
RUN chown -R nodeuser:nodejs /app
USER nodeuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8080) + '/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Expose the port
EXPOSE 8080

# Start the server
CMD ["node", "index.js"]