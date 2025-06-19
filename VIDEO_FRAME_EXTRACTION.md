# Video Frame Extraction Feature

## Date: June 19, 2025

### Feature Overview
Automatic extraction of video frames for thumbnails instead of using generic placeholders.

### Implementation Details

#### 1. Video Processing Utility
Created `lib/utils/video-processor.ts` with functions:
- `extractVideoThumbnail()` - Extract frame at specific timestamp
- `getVideoDuration()` - Get video duration using ffprobe
- `generateVideoThumbnailAtPercentage()` - Extract frame at percentage of video duration

#### 2. Upload API Enhancement
Updated `/api/posts/upload/route.ts`:
- Automatically extracts frame at 10% of video duration
- Optimizes extracted frame to WebP format
- Falls back to enhanced placeholder if extraction fails

#### 3. Server Requirements
- **ffmpeg** must be installed on the server
- Includes both `ffmpeg` and `ffprobe` commands

### Installation

#### Local Development (macOS)
```bash
brew install ffmpeg
```

#### Production Server (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y ffmpeg
```

Or use the provided script:
```bash
chmod +x scripts/install-ffmpeg.sh
./scripts/install-ffmpeg.sh
```

### How It Works

1. User uploads video file
2. Video is saved to disk
3. System attempts to extract frame at 10% duration
4. Frame is optimized and converted to WebP
5. Thumbnail URL is returned with the upload response
6. Feed displays actual video frame instead of placeholder

### Extracting Thumbnails for Existing Videos

Run the extraction script on the server:
```bash
cd /var/www/fonana
node scripts/extract-video-thumbnails.js
```

This will:
- Find all video posts
- Extract thumbnails for videos without them
- Update database with new thumbnail URLs

### Benefits

- **Better User Experience**: Users see actual video content preview
- **Improved Engagement**: Real thumbnails are more enticing than placeholders
- **Automatic Process**: No manual intervention needed
- **Optimized Performance**: Thumbnails are compressed to WebP format

### Troubleshooting

If thumbnail extraction fails:
1. Check if ffmpeg is installed: `which ffmpeg`
2. Check video file permissions
3. Verify video format is supported
4. Check server logs for specific errors

### Future Enhancements

1. Allow users to choose thumbnail timestamp
2. Generate multiple thumbnails for selection
3. Support for animated GIF previews
4. AI-based scene detection for best frame selection 