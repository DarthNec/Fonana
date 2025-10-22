#!/bin/bash

echo "🎬 Installing FFmpeg on Ubuntu..."
echo "=================================="
echo ""

# Обновляем список пакетов
echo "1️⃣ Updating package list..."
sudo apt update

echo ""

# Устанавливаем FFmpeg
echo "2️⃣ Installing FFmpeg..."
sudo apt install ffmpeg -y

echo ""

# Проверяем установку
echo "3️⃣ Verifying installation..."
if command -v ffmpeg &> /dev/null
then
    echo "✅ FFmpeg installed successfully!"
    echo ""
    ffmpeg -version | head -n 1
    echo ""
    echo "🎉 Ready to add watermarks to Sora videos!"
else
    echo "❌ FFmpeg installation failed"
    exit 1
fi

echo ""
echo "=================================="
echo "✅ Installation complete!"
echo ""






