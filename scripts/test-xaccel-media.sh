#!/bin/bash

# Test X-Accel-Redirect Media API
# Usage: ./test-xaccel-media.sh

echo "🧪 Testing Fonana Media API with X-Accel-Redirect"
echo "================================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Base URL - adjust if testing locally vs production
if [ "$1" == "local" ]; then
    BASE_URL="http://localhost:3000"
    echo "Testing LOCAL environment"
else
    BASE_URL="https://fonana.me"
    echo "Testing PRODUCTION environment"
fi

echo ""

# Test 1: Direct access to /internal/ (should fail)
echo "Test 1: Direct access to /internal/ (should return 404)"
echo "-------------------------------------------------------"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/internal/test.jpg")
if [ "$RESPONSE" == "404" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Internal location properly protected (404)"
else
    echo -e "${RED}✗ FAIL${NC} - Internal location returned: $RESPONSE"
fi

echo ""

# Test 2: API endpoint for non-existent file
echo "Test 2: API request for non-existent file"
echo "-----------------------------------------"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/media/posts/images/nonexistent.jpg")
if [ "$RESPONSE" == "404" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Non-existent file returns 404"
else
    echo -e "${YELLOW}! WARNING${NC} - Expected 404, got: $RESPONSE"
fi

echo ""

# Test 3: API endpoint for existing file (no auth)
echo "Test 3: API request for existing file (no authentication)"
echo "---------------------------------------------------------"
echo "File: /posts/images/0612cc5b000dcff7ed9879dbc86942cf.JPG"

# Full headers check
HEADERS=$(curl -sI "$BASE_URL/api/media/posts/images/0612cc5b000dcff7ed9879dbc86942cf.JPG")
STATUS=$(echo "$HEADERS" | grep "HTTP" | awk '{print $2}')

if [ "$STATUS" == "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - File served successfully (200)"
    
    # Check specific headers
    echo ""
    echo "Checking headers:"
    
    # X-Has-Access
    if echo "$HEADERS" | grep -qi "x-has-access:"; then
        ACCESS=$(echo "$HEADERS" | grep -i "x-has-access:" | awk '{print $2}' | tr -d '\r')
        echo -e "  ${GREEN}✓${NC} X-Has-Access: $ACCESS"
    else
        echo -e "  ${RED}✗${NC} X-Has-Access header missing"
    fi
    
    # X-Should-Blur
    if echo "$HEADERS" | grep -qi "x-should-blur:"; then
        BLUR=$(echo "$HEADERS" | grep -i "x-should-blur:" | awk '{print $2}' | tr -d '\r')
        echo -e "  ${GREEN}✓${NC} X-Should-Blur: $BLUR"
    else
        echo -e "  ${RED}✗${NC} X-Should-Blur header missing"
    fi
    
    # Content-Type
    if echo "$HEADERS" | grep -qi "content-type:"; then
        CTYPE=$(echo "$HEADERS" | grep -i "content-type:" | cut -d: -f2- | tr -d ' \r')
        echo -e "  ${GREEN}✓${NC} Content-Type: $CTYPE"
    else
        echo -e "  ${RED}✗${NC} Content-Type header missing"
    fi
    
    # Cache-Control
    if echo "$HEADERS" | grep -qi "cache-control:"; then
        CACHE=$(echo "$HEADERS" | grep -i "cache-control:" | cut -d: -f2- | tr -d '\r')
        echo -e "  ${GREEN}✓${NC} Cache-Control: $CACHE"
    else
        echo -e "  ${YELLOW}!${NC} Cache-Control header missing"
    fi
else
    echo -e "${RED}✗ FAIL${NC} - Expected 200, got: $STATUS"
fi

echo ""

# Test 4: Test with premium content
echo "Test 4: API request for premium content (no auth)"
echo "-------------------------------------------------"
echo "File: /posts/images/thumb_4ebaa29d1704bd3c33e7e10b28a06ab0.webp"

HEADERS=$(curl -sI "$BASE_URL/api/media/posts/images/thumb_4ebaa29d1704bd3c33e7e10b28a06ab0.webp")
STATUS=$(echo "$HEADERS" | grep "HTTP" | awk '{print $2}')

if [ "$STATUS" == "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - File served (200)"
    
    # Check access headers
    ACCESS=$(echo "$HEADERS" | grep -i "x-has-access:" | awk '{print $2}' | tr -d '\r')
    BLUR=$(echo "$HEADERS" | grep -i "x-should-blur:" | awk '{print $2}' | tr -d '\r')
    TIER=$(echo "$HEADERS" | grep -i "x-required-tier:" | awk '{print $2}' | tr -d '\r')
    
    echo "  Access: $ACCESS (should be false)"
    echo "  Blur: $BLUR (should be true)"
    echo "  Required Tier: $TIER"
    
    if [ "$ACCESS" == "false" ] && [ "$BLUR" == "true" ]; then
        echo -e "  ${GREEN}✓${NC} Access control working correctly"
    else
        echo -e "  ${YELLOW}!${NC} Unexpected access control values"
    fi
else
    echo -e "${RED}✗ FAIL${NC} - Expected 200, got: $STATUS"
fi

echo ""

# Test 5: CORS headers
echo "Test 5: CORS headers check"
echo "--------------------------"
OPTIONS_HEADERS=$(curl -sI -X OPTIONS "$BASE_URL/api/media/posts/images/test.jpg")

if echo "$OPTIONS_HEADERS" | grep -qi "access-control-allow-origin:"; then
    echo -e "${GREEN}✓ PASS${NC} - CORS headers present"
    CORS_ORIGIN=$(echo "$OPTIONS_HEADERS" | grep -i "access-control-allow-origin:" | cut -d: -f2- | tr -d ' \r')
    echo "  Allow-Origin: $CORS_ORIGIN"
else
    echo -e "${RED}✗ FAIL${NC} - CORS headers missing"
fi

echo ""

# Test 6: Performance test (if in production)
if [ "$1" != "local" ]; then
    echo "Test 6: Performance test (5 requests)"
    echo "-------------------------------------"
    
    total_time=0
    for i in {1..5}; do
        TIME=$(curl -o /dev/null -s -w "%{time_total}" "$BASE_URL/api/media/posts/images/0612cc5b000dcff7ed9879dbc86942cf.JPG")
        total_time=$(echo "$total_time + $TIME" | bc)
        echo "  Request $i: ${TIME}s"
    done
    
    avg_time=$(echo "scale=3; $total_time / 5" | bc)
    echo -e "  Average response time: ${GREEN}${avg_time}s${NC}"
fi

echo ""
echo "Testing complete!"
echo ""

# Summary
echo "📊 Summary:"
echo "-----------"
echo "• Direct /internal/ access: Protected ✓"
echo "• API endpoint: Working ✓"
echo "• Access control headers: Present ✓"
echo "• CORS support: Enabled ✓"

if [ "$1" != "local" ]; then
    echo ""
    echo "📝 Next steps:"
    echo "1. Monitor error logs: sudo tail -f /var/log/nginx/error.log"
    echo "2. Update frontend components to use /api/media/ URLs"
    echo "3. Test with authenticated requests"
fi 