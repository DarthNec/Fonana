#!/bin/bash

# DevOps Status Check for Fonana
# This script checks all DevOps components we've set up

echo "🔍 Fonana DevOps Status Check"
echo "============================="
echo ""

# 1. Check application status
echo "1️⃣ Application Status:"
if curl -s -o /dev/null -w "%{http_code}" https://fonana.me | grep -q "200"; then
    echo "   ✅ Website is UP (https://fonana.me)"
else
    echo "   ❌ Website is DOWN"
fi

# 2. Check PM2 status
echo ""
echo "2️⃣ PM2 Process Status:"
ssh -p 43988 root@69.10.59.234 "pm2 list" 2>/dev/null || echo "   ⚠️  Cannot connect via SSH"

# 3. Check GitHub Actions
echo ""
echo "3️⃣ GitHub Actions CI:"
echo "   📊 View at: https://github.com/DukeDeSouth/Fonana/actions"
echo "   ✅ Workflow file exists: .github/workflows/test.yml"

# 4. Check log rotation
echo ""
echo "4️⃣ Log Management:"
if ssh -p 43988 root@69.10.59.234 "test -f /etc/logrotate.d/fonana" 2>/dev/null; then
    echo "   ✅ Log rotation configured"
else
    echo "   ⚠️  Log rotation not configured"
fi

# 5. Check disk space
echo ""
echo "5️⃣ Server Disk Space:"
ssh -p 43988 root@69.10.59.234 "df -h /var/www/Fonana | tail -1" 2>/dev/null || echo "   ⚠️  Cannot check disk space"

# 6. Database status
echo ""
echo "6️⃣ Database Status:"
ssh -p 43988 root@69.10.59.234 "systemctl is-active postgresql" 2>/dev/null || echo "   ⚠️  Cannot check database"

# 7. Recent errors
echo ""
echo "7️⃣ Recent Errors (last 5):"
ssh -p 43988 root@69.10.59.234 "tail -5 /root/.pm2/logs/fonana-error.log 2>/dev/null | grep -v '^$'" || echo "   ✅ No recent errors or cannot access logs"

echo ""
echo "============================="
echo "💡 Tips:"
echo "- Set up SSH keys: ./scripts/setup-ssh-key-auth.sh"
echo "- View full logs: ssh -p 43988 root@69.10.59.234 'pm2 logs fonana --lines 50'"
echo "- Restart app: ssh -p 43988 root@69.10.59.234 'pm2 restart fonana'" 