#!/bin/bash

# Fix APT lock on production server
echo "🔧 Fixing APT lock on server 64.20.37.222..."

# Read password securely
read -s -p "Введи пароль SSH: " SSH_PASS
echo

# Kill apt processes and remove locks
sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no root@64.20.37.222 '
  echo "🔍 Checking apt processes..."
  ps aux | grep -E "(apt|dpkg)" | grep -v grep
  
  echo "🛑 Killing apt/dpkg processes..."
  pkill -f apt
  pkill -f dpkg
  
  echo "🗑️ Removing lock files..."
  rm -f /var/lib/dpkg/lock*
  rm -f /var/cache/apt/archives/lock
  rm -f /var/lib/apt/lists/lock
  
  echo "🔧 Configuring dpkg..."
  dpkg --configure -a
  
  echo "🔄 Updating package lists..."
  apt update
  
  echo "✅ APT lock fixed!"
'

echo "✅ APT unlock completed!" 