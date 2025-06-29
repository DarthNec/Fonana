#!/bin/bash

# Script to update Nginx configuration for WebSocket support
# Usage: ./scripts/update-nginx-websocket.sh

set -e

echo "🔧 Updating Nginx configuration for WebSocket support..."

# Server details
SERVER_USER="root"
SERVER_HOST="69.10.59.234"
SERVER_PORT="43988"

# Create the WebSocket config snippet
cat > /tmp/nginx-ws-location.conf << 'EOF'
    # WebSocket endpoint
    location /ws {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket specific settings
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        
        # Disable buffering for WebSocket
        proxy_buffering off;
        
        # Pass query parameters (important for JWT token)
        proxy_pass_request_args on;
    }
EOF

echo "📤 Uploading WebSocket configuration to server..."
scp -P $SERVER_PORT /tmp/nginx-ws-location.conf $SERVER_USER@$SERVER_HOST:/tmp/

# Connect to server and update Nginx
echo "🔄 Updating Nginx configuration on server..."
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST << 'ENDSSH'
    # Check if WebSocket location already exists
    if grep -q "location /ws" /etc/nginx/sites-available/fonana.me; then
        echo "⚠️ WebSocket location already exists in Nginx config"
        echo "📝 Showing current WebSocket configuration:"
        sed -n '/location \/ws/,/^    }/p' /etc/nginx/sites-available/fonana.me
    else
        echo "✅ Adding WebSocket location to Nginx config..."
        
        # Backup current config
        cp /etc/nginx/sites-available/fonana.me /etc/nginx/sites-available/fonana.me.backup-$(date +%Y%m%d-%H%M%S)
        
        # Insert WebSocket location before the last closing brace
        # Find the last } in the server block and insert before it
        sed -i '/^}$/i \
\
    # WebSocket endpoint added by update-nginx-websocket.sh\
    location /ws {\
        proxy_pass http://localhost:3002;\
        proxy_http_version 1.1;\
        proxy_set_header Upgrade $http_upgrade;\
        proxy_set_header Connection "upgrade";\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
        \
        # WebSocket specific settings\
        proxy_connect_timeout 7d;\
        proxy_send_timeout 7d;\
        proxy_read_timeout 7d;\
        \
        # Disable buffering for WebSocket\
        proxy_buffering off;\
        \
        # Pass query parameters (important for JWT token)\
        proxy_pass_request_args on;\
    }' /etc/nginx/sites-available/fonana.me
    fi
    
    # Test Nginx configuration
    echo "🧪 Testing Nginx configuration..."
    nginx -t
    
    # Reload Nginx
    echo "🔄 Reloading Nginx..."
    systemctl reload nginx
    
    echo "✅ Nginx configuration updated successfully!"
ENDSSH

# Clean up
rm /tmp/nginx-ws-location.conf

echo "🎉 WebSocket configuration update completed!"
echo ""
echo "📋 Next steps:"
echo "1. Deploy the WebSocket server fixes: ./deploy-to-production.sh"
echo "2. Check WebSocket connection: https://fonana.me/test/jwt-websocket"
echo "3. Monitor logs: ssh -p 43988 root@69.10.59.234 'pm2 logs fonana-ws'" 