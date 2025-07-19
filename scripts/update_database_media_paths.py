#!/usr/bin/env python3
"""
Fonana Database Media Paths Update Script [media_storage_2025_001]
Обновляет пути к медиа-файлам в PostgreSQL базе данных

Базируется на IMPLEMENTATION_SIMULATION.md:
- Добавляет backgroundImage поле к users
- Обновляет avatar пути
- Обновляет mediaUrl и thumbnail в posts
- Сохраняет оригинальные Supabase URLs в backup полях
"""

import os
import psycopg2
import random
from pathlib import Path
from typing import List, Dict

# [media_storage_2025_001] Database Configuration
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "fonana", 
    "user": "fonana_user",
    "password": "fonana_pass"
}

MEDIA_DIR = Path(__file__).parent.parent / "public" / "media"

def get_available_files(directory: Path) -> List[str]:
    """Get list of available media files in directory"""
    if not directory.exists():
        return []
    return [f.name for f in directory.glob("*.jpg")]

def connect_db():
    """Connect to PostgreSQL database"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = False
        return conn
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return None

def add_background_image_column(conn):
    """Add backgroundImage column to users table"""
    try:
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'backgroundImage'
        """)
        
        if cursor.fetchone():
            print("✅ backgroundImage column already exists")
            return True
            
        # Add the column
        cursor.execute("""
            ALTER TABLE users 
            ADD COLUMN "backgroundImage" TEXT
        """)
        
        conn.commit()
        print("✅ Added backgroundImage column to users table")
        return True
        
    except Exception as e:
        print(f"❌ Failed to add backgroundImage column: {e}")
        conn.rollback()
        return False

def backup_original_media_urls(conn):
    """Create backup columns for original Supabase URLs"""
    try:
        cursor = conn.cursor()
        
        # Check and add backup columns for users
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'avatar_backup'
        """)
        
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE users ADD COLUMN avatar_backup TEXT")
            cursor.execute("UPDATE users SET avatar_backup = avatar WHERE avatar IS NOT NULL")
            print("✅ Created avatar_backup column")
        
        # Check and add backup columns for posts
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'posts' AND column_name = 'mediaUrl_backup'
        """)
        
        if not cursor.fetchone():
            cursor.execute('ALTER TABLE posts ADD COLUMN "mediaUrl_backup" TEXT')
            cursor.execute('ALTER TABLE posts ADD COLUMN thumbnail_backup TEXT')
            cursor.execute('UPDATE posts SET "mediaUrl_backup" = "mediaUrl" WHERE "mediaUrl" IS NOT NULL')
            cursor.execute('UPDATE posts SET thumbnail_backup = thumbnail WHERE thumbnail IS NOT NULL')
            print("✅ Created mediaUrl_backup and thumbnail_backup columns")
        
        conn.commit()
        return True
        
    except Exception as e:
        print(f"❌ Failed to create backup columns: {e}")
        conn.rollback()
        return False

def update_user_avatars(conn):
    """Update user avatar paths to local files"""
    try:
        cursor = conn.cursor()
        
        # Get available avatar files
        avatar_files = get_available_files(MEDIA_DIR / "avatars")
        background_files = get_available_files(MEDIA_DIR / "backgrounds")
        
        if not avatar_files:
            print("⚠️ No avatar files found, skipping avatar update")
            return True
            
        print(f"📁 Found {len(avatar_files)} avatar files and {len(background_files)} background files")
            
        # Get all users
        cursor.execute("SELECT id, nickname FROM users ORDER BY id")
        users = cursor.fetchall()
        
        print(f"🔄 Updating avatars for {len(users)} users...")
        
        updated_count = 0
        for user_id, nickname in users:
            try:
                # Distribute files using hash for consistency (UUIDs are strings)
                user_hash = abs(hash(str(user_id))) if user_id else 0
                avatar_file = avatar_files[user_hash % len(avatar_files)]
                avatar_path = f"/media/avatars/{avatar_file}"
                
                # Background image (if available)
                bg_path = None
                if background_files:
                    bg_file = background_files[user_hash % len(background_files)]
                    bg_path = f"/media/backgrounds/{bg_file}"
                
                # Update user
                cursor.execute("""
                    UPDATE users 
                    SET avatar = %s, "backgroundImage" = %s 
                    WHERE id = %s
                """, (avatar_path, bg_path, user_id))
                
                updated_count += 1
                
            except Exception as user_error:
                print(f"❌ Error updating user {user_id}: {user_error}")
                continue
        
        conn.commit()
        print(f"✅ Updated {updated_count} user avatars and backgrounds")
        return True
        
    except Exception as e:
        print(f"❌ Failed to update user avatars: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
        return False

def update_post_media(conn):
    """Update post media URLs to local files"""
    try:
        cursor = conn.cursor()
        
        # Get available media files
        post_files = get_available_files(MEDIA_DIR / "posts")
        thumb_files = get_available_files(MEDIA_DIR / "thumbposts")
        
        if not post_files:
            print("⚠️ No post files found, skipping post media update")
            return True
            
        # Get all posts with their categories
        cursor.execute("""
            SELECT id, "creatorId", category, title 
            FROM posts 
            ORDER BY id
        """)
        posts = cursor.fetchall()
        
        print(f"🔄 Updating media for {len(posts)} posts...")
        
        # Category mapping for better file distribution
        category_files = {
            "art": [f for f in post_files if "art" in f],
            "tech": [f for f in post_files if "tech" in f],
            "lifestyle": [f for f in post_files if "lifestyle" in f],
            "trading": [f for f in post_files if "trading" in f],
            "gaming": [f for f in post_files if "gaming" in f],
            "music": [f for f in post_files if "music" in f],
            "education": [f for f in post_files if "education" in f],
            "comedy": [f for f in post_files if "comedy" in f],
            "intimate": [f for f in post_files if "intimate" in f]
        }
        
        updated_count = 0
        for post_id, creator_id, category, title in posts:
            try:
                # Select appropriate files based on category
                if category and category.lower() in category_files and category_files[category.lower()]:
                    available_posts = category_files[category.lower()]
                    available_thumbs = [f for f in thumb_files if category.lower() in f]
                else:
                    available_posts = post_files
                    available_thumbs = thumb_files
                
                # Use hash of post_id for consistent distribution (post IDs are integers)
                post_hash = abs(hash(str(post_id))) if post_id else 0
                
                if available_posts:
                    post_file = available_posts[post_hash % len(available_posts)]
                    media_path = f"/media/posts/{post_file}"
                else:
                    media_path = None
                    
                if available_thumbs:
                    thumb_file = available_thumbs[post_hash % len(available_thumbs)]
                    thumb_path = f"/media/thumbposts/{thumb_file}"
                else:
                    thumb_path = None
                
                # Update post
                if media_path or thumb_path:
                    cursor.execute("""
                        UPDATE posts 
                        SET "mediaUrl" = COALESCE(%s, "mediaUrl"), 
                            thumbnail = COALESCE(%s, thumbnail)
                        WHERE id = %s
                    """, (media_path, thumb_path, post_id))
                    updated_count += 1
                    
            except Exception as post_error:
                print(f"❌ Error updating post {post_id}: {post_error}")
                continue
        
        conn.commit()
        print(f"✅ Updated {updated_count} post media files")
        return True
        
    except Exception as e:
        print(f"❌ Failed to update post media: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
        return False

def verify_database_updates(conn):
    """Verify database updates were successful"""
    try:
        cursor = conn.cursor()
        
        # Check user updates
        cursor.execute("""
            SELECT 
                COUNT(*) as total_users,
                COUNT(avatar) as users_with_avatars,
                COUNT("backgroundImage") as users_with_backgrounds
            FROM users
        """)
        user_stats = cursor.fetchone()
        
        # Check post updates  
        cursor.execute("""
            SELECT 
                COUNT(*) as total_posts,
                COUNT("mediaUrl") as posts_with_media,
                COUNT(thumbnail) as posts_with_thumbnails
            FROM posts
        """)
        post_stats = cursor.fetchone()
        
        print(f"\n📊 Database Update Verification:")
        print(f"   Users: {user_stats[0]} total")
        print(f"   - With avatars: {user_stats[1]}")
        print(f"   - With backgrounds: {user_stats[2]}")
        print(f"   Posts: {post_stats[0]} total") 
        print(f"   - With media: {post_stats[1]}")
        print(f"   - With thumbnails: {post_stats[2]}")
        
        return True
        
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        return False

def main():
    """Main execution function"""
    print("🚀 Starting Database Media Paths Update [media_storage_2025_001]")
    
    # Check if media files exist
    if not MEDIA_DIR.exists():
        print(f"❌ Media directory not found: {MEDIA_DIR}")
        return False
    
    # Connect to database
    conn = connect_db()
    if not conn:
        return False
    
    try:
        # Phase 1: Add backgroundImage column
        if not add_background_image_column(conn):
            return False
            
        # Phase 2: Backup original URLs
        if not backup_original_media_urls(conn):
            return False
            
        # Phase 3: Update user avatars and backgrounds
        if not update_user_avatars(conn):
            return False
            
        # Phase 4: Update post media
        if not update_post_media(conn):
            return False
            
        # Phase 5: Verify updates
        if not verify_database_updates(conn):
            return False
        
        print("✅ Database media paths update completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Database update failed: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1) 