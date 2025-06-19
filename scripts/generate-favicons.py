#!/usr/bin/env python3

import os
import sys
from PIL import Image

print("🎨 Generating favicons from fonanaLogo1.png...")

# Check if source file exists
source_file = "public/fonanaLogo1.png"
if not os.path.exists(source_file):
    print(f"❌ Source file {source_file} not found!")
    sys.exit(1)

try:
    # Open the source image
    img = Image.open(source_file)
    
    # Convert to RGBA if necessary
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Generate different sizes
    print("📏 Generating favicon sizes...")
    
    # PNG formats
    img.resize((16, 16), Image.Resampling.LANCZOS).save("public/favicon-16x16.png", "PNG")
    img.resize((32, 32), Image.Resampling.LANCZOS).save("public/favicon-32x32.png", "PNG")
    img.resize((48, 48), Image.Resampling.LANCZOS).save("public/favicon-48x48.png", "PNG")
    img.resize((180, 180), Image.Resampling.LANCZOS).save("public/apple-touch-icon.png", "PNG")
    
    # Create a simple favicon.ico from 32x32 PNG
    img.resize((32, 32), Image.Resampling.LANCZOS).save("public/favicon.png", "PNG")
    
    print("✅ Favicons generated successfully!")
    print("")
    print("Generated files:")
    print("  - /public/favicon.png")
    print("  - /public/favicon-16x16.png")
    print("  - /public/favicon-32x32.png")
    print("  - /public/favicon-48x48.png")
    print("  - /public/apple-touch-icon.png")
    print("")
    print("🚀 You can now deploy to production!")
    
except ImportError:
    print("❌ Pillow is not installed. Please install it first:")
    print("   pip install Pillow")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error generating favicons: {e}")
    sys.exit(1) 