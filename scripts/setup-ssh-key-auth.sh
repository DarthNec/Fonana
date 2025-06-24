#!/bin/bash

# Setup SSH Key Authentication for Fonana
# This will help avoid entering password multiple times

echo "🔑 Setting up SSH key authentication for Fonana..."
echo ""
echo "This script will help you set up passwordless SSH access to your server."
echo ""

# Check if SSH key exists
if [ ! -f ~/.ssh/id_rsa.pub ]; then
    echo "❌ No SSH key found. Creating one..."
    ssh-keygen -t rsa -b 4096 -C "fonana-deploy" -f ~/.ssh/id_rsa -N ""
    echo "✅ SSH key created!"
fi

echo ""
echo "📋 Your public SSH key:"
echo "========================="
cat ~/.ssh/id_rsa.pub
echo "========================="
echo ""
echo "📝 Next steps:"
echo "1. Copy the public key above"
echo "2. Add it to server: ssh -p 43988 root@69.10.59.234 'mkdir -p ~/.ssh && echo \"YOUR_KEY_HERE\" >> ~/.ssh/authorized_keys'"
echo "3. Test connection: ssh -p 43988 root@69.10.59.234 'echo Connected!'"
echo ""
echo "💡 Or use this one-liner (you'll need to enter password one last time):"
echo "ssh-copy-id -p 43988 root@69.10.59.234" 