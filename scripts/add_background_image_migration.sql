-- Fonana Media Storage Migration [media_storage_2025_001]
-- Добавляет backgroundImage поле к таблице users
-- Создает backup колонки для оригинальных Supabase URLs

BEGIN;

-- Add backgroundImage column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "backgroundImage" TEXT;

-- Add backup columns for original Supabase URLs
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_backup TEXT;

ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS "mediaUrl_backup" TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_backup TEXT;

-- Backup existing URLs before updating to local paths
UPDATE users 
SET avatar_backup = avatar 
WHERE avatar IS NOT NULL AND avatar_backup IS NULL;

UPDATE posts 
SET "mediaUrl_backup" = "mediaUrl",
    thumbnail_backup = thumbnail
WHERE ("mediaUrl" IS NOT NULL OR thumbnail IS NOT NULL) 
  AND ("mediaUrl_backup" IS NULL OR thumbnail_backup IS NULL);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_background_image ON users("backgroundImage");
CREATE INDEX IF NOT EXISTS idx_posts_media_url ON posts("mediaUrl");
CREATE INDEX IF NOT EXISTS idx_posts_thumbnail ON posts(thumbnail);

COMMIT;

-- Verification queries
SELECT 
    COUNT(*) as total_users,
    COUNT(avatar) as users_with_avatars,
    COUNT("backgroundImage") as users_with_backgrounds,
    COUNT(avatar_backup) as users_with_backup
FROM users;

SELECT 
    COUNT(*) as total_posts,
    COUNT("mediaUrl") as posts_with_media,
    COUNT(thumbnail) as posts_with_thumbnails,
    COUNT("mediaUrl_backup") as posts_with_backup
FROM posts; 