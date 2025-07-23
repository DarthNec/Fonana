#!/bin/bash

# Log Forwarding Setup Script for Fonana
# This script sets up basic log forwarding without breaking existing infrastructure

echo "📊 Setting up log forwarding for Fonana..."

# Option 1: Simple file-based log rotation and archiving
cat << 'EOF' > /etc/logrotate.d/fonana
/var/www/Fonana/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Option 2: Forward PM2 logs to syslog (can be collected by external tools)
# Uncomment if you want to enable syslog forwarding
# pm2 install pm2-syslog

# Option 3: Simple webhook for critical errors (replace URL)
cat << 'EOF' > /var/www/Fonana/scripts/log-monitor.sh
#!/bin/bash
# Monitor error logs and send webhooks for critical errors
tail -F /var/www/Fonana/logs/pm2-error.log | while read line; do
    if echo "$line" | grep -E "(CRITICAL|FATAL|Error:.*at.*\.js)" > /dev/null; then
        # Send to webhook (replace with your endpoint)
        # curl -X POST -H "Content-Type: application/json" \
        #      -d "{\"text\":\"Fonana Error: $line\"}" \
        #      https://your-webhook-url.com/
        echo "Critical error detected: $line"
    fi
done
EOF

chmod +x /var/www/Fonana/scripts/log-monitor.sh

echo "✅ Log forwarding setup complete!"
echo ""
echo "Options available:"
echo "1. Logrotate configured for daily rotation"
echo "2. PM2 syslog module can be enabled with: pm2 install pm2-syslog" 
echo "3. Basic error monitoring script created at /var/www/Fonana/scripts/log-monitor.sh" 