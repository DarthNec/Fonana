#!/usr/bin/env node

const sharp = require('sharp')
const path = require('path')

async function createPlaceholderImage() {
  const outputPath = path.join(__dirname, '../public/placeholder-image.png')
  
  try {
    // Создаем серый placeholder с текстом
    const width = 800
    const height = 600
    
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="#e5e7eb"/>
        <text x="${width/2}" y="${height/2 - 20}" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" fill="#9ca3af">
          Image Not Found
        </text>
        <text x="${width/2}" y="${height/2 + 30}" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#9ca3af">
          Placeholder
        </text>
      </svg>
    `
    
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath)
    
    console.log(`✅ Created placeholder image at: ${outputPath}`)
  } catch (error) {
    console.error('❌ Error creating placeholder:', error)
    process.exit(1)
  }
}

createPlaceholderImage() 