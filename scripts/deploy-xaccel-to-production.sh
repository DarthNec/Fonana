#!/bin/bash

# Deploy X-Accel-Redirect to Fonana Production
# Server: 64.20.37.222 (fonana.me)

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PRODUCTION_SERVER="64.20.37.222"
DEPLOY_PATH="/var/www/Fonana"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   DEPLOYING X-ACCEL-REDIRECT TO PRODUCTION    ${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Step 1: Copy deployment scripts to server
echo -e "${GREEN}[1/5]${NC} Copying scripts to production..."
scp scripts/deploy-nginx-xaccel.sh root@${PRODUCTION_SERVER}:/tmp/
scp scripts/test-xaccel-media.sh root@${PRODUCTION_SERVER}:/tmp/

# Step 2: Make scripts executable
echo -e "${GREEN}[2/5]${NC} Making scripts executable..."
ssh root@${PRODUCTION_SERVER} "chmod +x /tmp/deploy-nginx-xaccel.sh /tmp/test-xaccel-media.sh"

# Step 3: Run deployment script
echo -e "${GREEN}[3/5]${NC} Running Nginx configuration update..."
ssh root@${PRODUCTION_SERVER} "/tmp/deploy-nginx-xaccel.sh"

# Step 4: Test the deployment
echo -e "${GREEN}[4/5]${NC} Testing X-Accel-Redirect..."
ssh root@${PRODUCTION_SERVER} "/tmp/test-xaccel-media.sh"

# Step 5: Clean up
echo -e "${GREEN}[5/5]${NC} Cleaning up temporary files..."
ssh root@${PRODUCTION_SERVER} "rm -f /tmp/deploy-nginx-xaccel.sh /tmp/test-xaccel-media.sh"

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "📝 Next steps:"
echo "1. Monitor logs: ssh root@${PRODUCTION_SERVER} 'tail -f /var/log/nginx/error.log'"
echo "2. Test from local: curl -I https://fonana.me/api/media/posts/images/test.webp"
echo "3. Begin Phase 3 (Frontend integration)" 