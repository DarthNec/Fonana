#!/bin/bash

echo "📹 Installing ffmpeg for video processing..."

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo "Detected macOS"
    if ! command -v ffmpeg &> /dev/null; then
        echo "Installing ffmpeg via Homebrew..."
        brew install ffmpeg
    else
        echo "✅ ffmpeg is already installed"
        ffmpeg -version | head -n 1
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    echo "Detected Linux"
    if ! command -v ffmpeg &> /dev/null; then
        echo "Installing ffmpeg..."
        # Check if running as root or with sudo
        if [ "$EUID" -ne 0 ]; then 
            echo "Please run with sudo: sudo $0"
            exit 1
        fi
        
        # Update package list
        apt-get update
        
        # Install ffmpeg
        apt-get install -y ffmpeg
    else
        echo "✅ ffmpeg is already installed"
        ffmpeg -version | head -n 1
    fi
else
    echo "❌ Unsupported OS: $OSTYPE"
    exit 1
fi

echo ""
echo "✅ ffmpeg installation complete!"
echo ""
echo "To install on production server, run:"
echo "ssh -p 43988 root@69.10.59.234 'bash -s' < scripts/install-ffmpeg.sh" 