# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache dumb-init

# Remove existing nginx user and group, then create new ones with specific IDs
RUN deluser nginx 2>/dev/null || true && \
    delgroup nginx 2>/dev/null || true && \
    addgroup -g 1000 -S nginx && \
    adduser -S -D -H -u 1000 -h /var/cache/nginx -s /sbin/nologin -G nginx nginx

# Copy built application
COPY --from=builder /app/dist/vinabot-rides-app/browser /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create necessary directories and set permissions
RUN mkdir -p /var/cache/nginx /var/run /var/log/nginx /tmp && \
    chown -R nginx:nginx /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html /tmp && \
    chmod -R 755 /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html /tmp

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 8082

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8082/health || exit 1

# Start nginx
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["nginx", "-g", "daemon off;"]
