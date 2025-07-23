#!/bin/bash

# Deploy Nginx X-Accel-Redirect configuration
# Usage: ./deploy-nginx-xaccel.sh

set -e  # Exit on error

echo "🚀 Deploying Nginx X-Accel-Redirect configuration for Fonana"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NGINX_CONFIG="/etc/nginx/sites-available/fonana"
NGINX_BACKUP="/etc/nginx/sites-available/fonana.backup-$(date +%Y%m%d-%H%M%S)"
TEMP_CONFIG="/tmp/fonana-nginx-temp.conf"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

# Check if running on production
if [ ! -d "/var/www/Fonana" ]; then
    print_error "This script must be run on the production server!"
    exit 1
fi

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run with sudo"
    exit 1
fi

# Step 1: Backup current config
print_status "Backing up current Nginx config..."
cp $NGINX_CONFIG $NGINX_BACKUP
print_status "Backup saved to: $NGINX_BACKUP"

# Step 2: Check if X-Accel already configured
if grep -q "location /internal/" $NGINX_CONFIG; then
    print_warning "X-Accel-Redirect already configured in Nginx"
    echo "Do you want to update it anyway? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Aborting..."
        exit 0
    fi
fi

# Step 3: Create temporary config with X-Accel
print_status "Creating updated configuration..."

# Read current config
CURRENT_CONFIG=$(cat $NGINX_CONFIG)

# Check if we need to add the internal location
if ! grep -q "location /internal/" $NGINX_CONFIG; then
    # Find where to insert (before the last closing brace of server block)
    # We'll insert it before the existing location blocks
    
    cat > $TEMP_CONFIG << 'EOF'
# Temporary marker for sed replacement
# X_ACCEL_REDIRECT_CONFIG_START

    # Internal location for X-Accel-Redirect (Media API)
    location /internal/ {
        internal;  # Only accessible via X-Accel-Redirect
        
        # Map to actual file location
        alias /var/www/Fonana/public/;
        
        # Security headers
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "DENY" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Expose-Headers "X-Has-Access, X-Should-Blur, X-Should-Dim, X-Upgrade-Prompt, X-Required-Tier, X-Access-Type" always;
        
        # Enable byte-range support
        add_header Accept-Ranges bytes always;
        
        # Image handling
        location ~ \.(jpg|jpeg|png|gif|webp|svg|ico)$ {
            expires 1y;
            add_header Cache-Control "public, max-age=31536000, immutable" always;
        }
        
        # Video handling
        location ~ \.(mp4|webm|mov|avi|mkv)$ {
            mp4;
            mp4_buffer_size 1m;
            mp4_max_buffer_size 5m;
            expires 30d;
            add_header Cache-Control "public, max-age=2592000" always;
        }
        
        # Audio handling
        location ~ \.(mp3|wav|ogg|m4a|aac)$ {
            expires 30d;
            add_header Cache-Control "public, max-age=2592000" always;
        }
        
        # Default
        expires 7d;
        add_header Cache-Control "public, max-age=604800" always;
    }

# X_ACCEL_REDIRECT_CONFIG_END
EOF

    # Insert the config into the main nginx config
    # We'll add it after the first location block
    awk '
    /^[[:space:]]*location[[:space:]]+\// && !done {
        print
        print ""
        while ((getline line < "/tmp/fonana-nginx-temp.conf") > 0) {
            print line
        }
        close("/tmp/fonana-nginx-temp.conf")
        done = 1
        next
    }
    {print}
    ' $NGINX_CONFIG > "${NGINX_CONFIG}.new"
    
    mv "${NGINX_CONFIG}.new" $NGINX_CONFIG
    rm -f $TEMP_CONFIG
else
    print_warning "X-Accel-Redirect already present, skipping insertion"
fi

# Step 4: Test Nginx configuration
print_status "Testing Nginx configuration..."
nginx -t
if [ $? -ne 0 ]; then
    print_error "Nginx configuration test failed!"
    print_status "Restoring backup..."
    cp $NGINX_BACKUP $NGINX_CONFIG
    exit 1
fi

# Step 5: Reload Nginx
print_status "Reloading Nginx..."
systemctl reload nginx
if [ $? -ne 0 ]; then
    print_error "Nginx reload failed!"
    print_status "Restoring backup..."
    cp $NGINX_BACKUP $NGINX_CONFIG
    systemctl reload nginx
    exit 1
fi

print_status "Nginx X-Accel-Redirect configured successfully!"

# Step 6: Verify configuration
print_status "Verifying configuration..."

# Test that internal location returns 404 when accessed directly
echo -n "Testing direct access to /internal/ (should fail)... "
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://fonana.me/internal/test.jpg)
if [ "$RESPONSE" = "404" ]; then
    print_status "Protected correctly (404)"
else
    print_warning "Unexpected response: $RESPONSE"
fi

# Test API endpoint
echo -n "Testing /api/media/ endpoint... "
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/media/test.jpg)
if [ "$RESPONSE" = "404" ]; then
    print_status "API endpoint responding"
else
    print_warning "API response: $RESPONSE"
fi

echo ""
print_status "Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Test the Media API: curl -I https://fonana.me/api/media/posts/images/[filename]"
echo "2. Update frontend to use /api/media/ URLs"
echo "3. Monitor Nginx error logs: tail -f /var/log/nginx/error.log"
echo ""
echo "🔄 To rollback if needed:"
echo "   sudo cp $NGINX_BACKUP $NGINX_CONFIG"
echo "   sudo systemctl reload nginx"
echo "" 