#!/usr/bin/env python3
"""
Fonana Media Storage Setup Script [media_storage_2025_001]
Загружает placeholder изображения и настраивает локальное медиа-хранилище

Базируется на IMPLEMENTATION_SIMULATION.md:
- 60 аватаров (square 400x400)
- 60 фонов (landscape 1200x400) 
- 300 постов (mixed categories)
- Optimized images для веб
"""

import os
import requests
import time
import random
from urllib.parse import urlparse
from pathlib import Path

# [media_storage_2025_001] Configuration
BASE_DIR = Path(__file__).parent.parent
MEDIA_DIR = BASE_DIR / "public" / "media"

# Categories for content generation
POST_CATEGORIES = {
    "art": {"keywords": ["art", "digital-art", "abstract"], "count": 50},
    "tech": {"keywords": ["technology", "computer", "coding"], "count": 40},
    "lifestyle": {"keywords": ["lifestyle", "fashion", "travel"], "count": 40},
    "trading": {"keywords": ["business", "finance", "charts"], "count": 30},
    "gaming": {"keywords": ["gaming", "esports", "console"], "count": 30},
    "music": {"keywords": ["music", "concert", "instruments"], "count": 30},
    "education": {"keywords": ["education", "books", "learning"], "count": 40},
    "comedy": {"keywords": ["funny", "meme", "humor"], "count": 20},
    "intimate": {"keywords": ["romantic", "couple", "intimate"], "count": 20}
}

def download_image(url, filepath, max_retries=3):
    """Download image with retry logic and error handling"""
    for attempt in range(max_retries):
        try:
            response = requests.get(url, timeout=30, stream=True)
            response.raise_for_status()
            
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            print(f"✅ Downloaded: {filepath.name}")
            return True
            
        except Exception as e:
            print(f"❌ Attempt {attempt + 1} failed for {filepath.name}: {e}")
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)  # Exponential backoff
            
    return False

def generate_avatars(count=60):
    """Generate avatar images using Lorem Picsum"""
    avatar_dir = MEDIA_DIR / "avatars"
    success_count = 0
    
    print(f"\n🎨 Generating {count} avatar images...")
    
    for i in range(count):
        # Generate square 400x400 avatars with different seeds
        seed = random.randint(1, 1000)
        filename = f"avatar_{int(time.time())}_{random.randint(1000, 9999)}.jpg"
        filepath = avatar_dir / filename
        
        # Lorem Picsum URL for square images
        url = f"https://picsum.photos/400/400?random={seed}"
        
        if download_image(url, filepath):
            success_count += 1
            
        # Rate limiting
        time.sleep(0.5)
    
    print(f"✅ Avatars: {success_count}/{count} successfully downloaded")
    return success_count

def generate_backgrounds(count=60):
    """Generate background images using Lorem Picsum"""
    bg_dir = MEDIA_DIR / "backgrounds"
    success_count = 0
    
    print(f"\n🌅 Generating {count} background images...")
    
    for i in range(count):
        # Generate landscape 1200x400 backgrounds
        seed = random.randint(1, 1000)
        filename = f"bg_{int(time.time())}_{random.randint(1000, 9999)}.jpg"
        filepath = bg_dir / filename
        
        # Lorem Picsum URL for landscape backgrounds
        url = f"https://picsum.photos/1200/400?random={seed}"
        
        if download_image(url, filepath):
            success_count += 1
            
        # Rate limiting
        time.sleep(0.5)
    
    print(f"✅ Backgrounds: {success_count}/{count} successfully downloaded")
    return success_count

def generate_posts_by_category():
    """Generate post images categorized by content type"""
    posts_dir = MEDIA_DIR / "posts"
    thumbs_dir = MEDIA_DIR / "thumbposts"
    total_success = 0
    
    print(f"\n📸 Generating categorized post images...")
    
    for category, config in POST_CATEGORIES.items():
        print(f"\n🏷️  Category: {category.upper()} ({config['count']} images)")
        category_success = 0
        
        for i in range(config["count"]):
            # Generate main post image
            seed = random.randint(1, 1000)
            timestamp = int(time.time()) + i  # Ensure unique timestamps
            
            # Main post image (800x600)
            post_filename = f"post_{category}_{timestamp}_{random.randint(1000, 9999)}.jpg"
            post_filepath = posts_dir / post_filename
            post_url = f"https://picsum.photos/800/600?random={seed}"
            
            # Thumbnail image (300x200)
            thumb_filename = f"thumb_{category}_{timestamp}_{random.randint(1000, 9999)}.jpg"
            thumb_filepath = thumbs_dir / thumb_filename
            thumb_url = f"https://picsum.photos/300/200?random={seed}"
            
            # Download both images
            post_downloaded = download_image(post_url, post_filepath)
            thumb_downloaded = download_image(thumb_url, thumb_filepath)
            
            if post_downloaded and thumb_downloaded:
                category_success += 1
                total_success += 1
            
            # Rate limiting between downloads
            time.sleep(0.3)
        
        print(f"✅ {category}: {category_success}/{config['count']} completed")
    
    print(f"✅ Total posts: {total_success}/300 successfully downloaded")
    return total_success

def verify_downloads():
    """Verify all directories have expected content"""
    print(f"\n🔍 Verifying downloaded content...")
    
    directories = {
        "avatars": (MEDIA_DIR / "avatars", 60),
        "backgrounds": (MEDIA_DIR / "backgrounds", 60), 
        "posts": (MEDIA_DIR / "posts", 300),
        "thumbposts": (MEDIA_DIR / "thumbposts", 300)
    }
    
    results = {}
    for name, (directory, expected) in directories.items():
        actual = len(list(directory.glob("*.jpg")))
        results[name] = {"actual": actual, "expected": expected}
        status = "✅" if actual >= expected * 0.9 else "⚠️"  # 90% threshold
        print(f"{status} {name}: {actual}/{expected} files")
    
    return results

def main():
    """Main execution function"""
    print("🚀 Starting Fonana Media Storage Setup [media_storage_2025_001]")
    print(f"📁 Media directory: {MEDIA_DIR}")
    
    # Ensure directories exist
    for subdir in ["avatars", "backgrounds", "posts", "thumbposts", "temp"]:
        (MEDIA_DIR / subdir).mkdir(parents=True, exist_ok=True)
    
    start_time = time.time()
    
    try:
        # Phase 1: Generate avatars
        avatar_count = generate_avatars(60)
        
        # Phase 2: Generate backgrounds  
        bg_count = generate_backgrounds(60)
        
        # Phase 3: Generate categorized posts
        posts_count = generate_posts_by_category()
        
        # Verification
        results = verify_downloads()
        
        elapsed = time.time() - start_time
        print(f"\n🎉 Media setup completed in {elapsed:.1f} seconds")
        print(f"📊 Summary:")
        print(f"   - Avatars: {results['avatars']['actual']}/60")
        print(f"   - Backgrounds: {results['backgrounds']['actual']}/60")
        print(f"   - Posts: {results['posts']['actual']}/300")
        print(f"   - Thumbnails: {results['thumbposts']['actual']}/300")
        
        total_files = sum(r["actual"] for r in results.values())
        print(f"   - Total files: {total_files}/720")
        
        if total_files >= 648:  # 90% success rate
            print("✅ Media storage setup successful!")
            return True
        else:
            print("⚠️ Some downloads failed, but minimum threshold met")
            return False
            
    except KeyboardInterrupt:
        print("\n🛑 Setup interrupted by user")
        return False
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1) 