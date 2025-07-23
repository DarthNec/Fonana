#!/bin/bash

# Fix Nginx to properly proxy /api/media to Next.js

echo "🔧 Fixing Nginx configuration for Media API..."

# Create a fixed Nginx config that ensures /api/ goes to Next.js
cat > /tmp/nginx-api-fix.conf << 'EOF'
# Add this BEFORE any static file handling locations

# API routes MUST proxy to Next.js
location /api/ {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Important for large uploads
    client_max_body_size 100M;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
}
EOF

echo "📝 Instructions to fix:"
echo "1. SSH to server: ssh root@64.20.37.222"
echo "2. Edit Nginx config: nano /etc/nginx/sites-available/fonana"
echo "3. Add the /api/ location block BEFORE any image/static file handlers"
echo "4. Test config: nginx -t"
echo "5. Reload: systemctl reload nginx"
echo ""
echo "The issue is that Nginx has a general image handler that catches ALL .jpg/.webp files"
echo "We need /api/ to be proxied to Next.js BEFORE those handlers kick in." 