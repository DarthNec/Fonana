#!/bin/bash

# Setup Deploy User for Fonana
# Run this on the production server as root

echo "👤 Setting up deploy user for Fonana..."

# Create deploy user
useradd -m -s /bin/bash deploy || echo "User already exists"

# Add to necessary groups
usermod -aG www-data deploy

# Create .ssh directory
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh

# Copy authorized keys from root (if you want to keep same SSH keys)
# cp /root/.ssh/authorized_keys /home/deploy/.ssh/
# Or add specific deploy key:
echo "# Add your deploy SSH public key here" > /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh

# Give sudo permissions for specific commands only
cat << 'EOF' > /etc/sudoers.d/deploy-fonana
# Deploy user can run these commands without password
deploy ALL=(ALL) NOPASSWD: /usr/bin/pm2 *
deploy ALL=(ALL) NOPASSWD: /usr/bin/npm *
deploy ALL=(ALL) NOPASSWD: /usr/bin/npx *
deploy ALL=(ALL) NOPASSWD: /usr/bin/git *
deploy ALL=(ALL) NOPASSWD: /usr/sbin/nginx -s reload
deploy ALL=(ALL) NOPASSWD: /bin/systemctl restart postgresql
deploy ALL=(ALL) NOPASSWD: /bin/systemctl status postgresql
EOF

# Create deployment directory with proper permissions
mkdir -p /var/www/Fonana
chown -R deploy:www-data /var/www/Fonana
chmod -R 775 /var/www/Fonana

# Ensure PM2 runs as deploy user
pm2 stop all || true
pm2 delete all || true
su - deploy -c "pm2 startup systemd -u deploy --hp /home/deploy"
systemctl enable pm2-deploy

echo "✅ Deploy user setup complete!"
echo ""
echo "Next steps:"
echo "1. Add your SSH public key to /home/deploy/.ssh/authorized_keys"
echo "2. Test connection: ssh -p 43988 deploy@69.10.59.234"
echo "3. Update deploy script to use deploy user instead of root"
echo ""
echo "⚠️  Keep root access for emergency situations!" 