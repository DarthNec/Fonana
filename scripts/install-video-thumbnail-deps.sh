#!/bin/bash

echo "📦 Installing video thumbnail dependencies..."

# Install ffmpeg on the system
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if ! command -v ffmpeg &> /dev/null; then
        echo "Installing ffmpeg for macOS..."
        brew install ffmpeg
    else
        echo "✅ ffmpeg already installed"
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if ! command -v ffmpeg &> /dev/null; then
        echo "Installing ffmpeg for Linux..."
        sudo apt-get update
        sudo apt-get install -y ffmpeg
    else
        echo "✅ ffmpeg already installed"
    fi
fi

# Install npm package
echo "Installing fluent-ffmpeg npm package..."
npm install fluent-ffmpeg
npm install --save-dev @types/fluent-ffmpeg

echo "✅ Video thumbnail dependencies installed!" 