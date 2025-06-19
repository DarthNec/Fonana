#!/bin/bash

echo "🎨 Generating favicons from fonanaLogo1.png..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick is not installed. Please install it first:"
    echo "   macOS: brew install imagemagick"
    echo "   Ubuntu: sudo apt-get install imagemagick"
    exit 1
fi

# Navigate to the public directory
cd public

# Generate different sizes
echo "📏 Generating favicon sizes..."

# ICO format (multiple sizes in one file)
convert fonanaLogo1.png -resize 16x16 favicon-16.png
convert fonanaLogo1.png -resize 32x32 favicon-32.png
convert fonanaLogo1.png -resize 48x48 favicon-48.png
convert favicon-16.png favicon-32.png favicon-48.png favicon.ico
rm favicon-16.png favicon-32.png favicon-48.png

# PNG formats
convert fonanaLogo1.png -resize 16x16 favicon-16x16.png
convert fonanaLogo1.png -resize 32x32 favicon-32x32.png
convert fonanaLogo1.png -resize 180x180 apple-touch-icon.png

echo "✅ Favicons generated successfully!"
echo ""
echo "Generated files:"
echo "  - /public/favicon.ico"
echo "  - /public/favicon-16x16.png"
echo "  - /public/favicon-32x32.png"
echo "  - /public/apple-touch-icon.png"
echo ""
echo "🚀 You can now deploy to production!" 