import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs/promises'

const execAsync = promisify(exec)

export async function extractVideoThumbnail(
  videoPath: string,
  outputPath: string,
  timestamp: string = '00:00:01'
): Promise<boolean> {
  try {
    // Check if ffmpeg is available
    try {
      await execAsync('which ffmpeg')
    } catch {
      console.error('ffmpeg is not installed')
      return false
    }

    // Extract frame at specified timestamp
    const command = `ffmpeg -i "${videoPath}" -ss ${timestamp} -vframes 1 -q:v 2 "${outputPath}" -y`
    
    console.log('Extracting video thumbnail with command:', command)
    
    const { stderr } = await execAsync(command)
    
    // ffmpeg writes to stderr even on success
    if (stderr && !stderr.includes('frame=')) {
      console.error('ffmpeg stderr:', stderr)
    }
    
    // Check if output file was created
    try {
      await fs.access(outputPath)
      console.log('Video thumbnail extracted successfully:', outputPath)
      return true
    } catch {
      console.error('Failed to create thumbnail file')
      return false
    }
    
  } catch (error) {
    console.error('Error extracting video thumbnail:', error)
    return false
  }
}

export async function getVideoDuration(videoPath: string): Promise<number | null> {
  try {
    const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    const { stdout } = await execAsync(command)
    const duration = parseFloat(stdout.trim())
    
    if (!isNaN(duration)) {
      return duration
    }
    
    return null
  } catch (error) {
    console.error('Error getting video duration:', error)
    return null
  }
}

export async function generateVideoThumbnailAtPercentage(
  videoPath: string,
  outputPath: string,
  percentage: number = 10
): Promise<boolean> {
  try {
    // Get video duration
    const duration = await getVideoDuration(videoPath)
    
    if (!duration) {
      // Fallback to 1 second if can't get duration
      return extractVideoThumbnail(videoPath, outputPath, '00:00:01')
    }
    
    // Calculate timestamp at percentage
    const timestampSeconds = (duration * percentage) / 100
    const hours = Math.floor(timestampSeconds / 3600)
    const minutes = Math.floor((timestampSeconds % 3600) / 60)
    const seconds = Math.floor(timestampSeconds % 60)
    
    const timestamp = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    
    return extractVideoThumbnail(videoPath, outputPath, timestamp)
  } catch (error) {
    console.error('Error generating video thumbnail at percentage:', error)
    return false
  }
} 