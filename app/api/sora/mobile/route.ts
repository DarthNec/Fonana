import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      prompt,
      seconds = '4',
      size = '1080x1920',
      referenceImage = null // Base64 string or null
    } = body

    console.log('[API /sora/mobile] Starting Sora-2 video generation...', {
      prompt: prompt?.substring(0, 50) + '...',
      seconds,
      size,
      hasReferenceImage: !!referenceImage
    })

    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not found' },
        { status: 500 }
      )
    }

    const soraFormData = new FormData()
    soraFormData.append('model', 'sora-2')
    soraFormData.append('prompt', prompt)
    soraFormData.append('seconds', seconds)
    soraFormData.append('size', size)

    // Если есть референсное изображение, добавляем его
    if (referenceImage) {
      try {
        // Конвертируем base64 в blob
        const base64Data = referenceImage.replace(/^data:image\/[a-z]+;base64,/, '')
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: 'image/png' })
        
        soraFormData.append('input_reference', blob, 'reference.png')
        console.log('[API /sora/mobile] Reference image added to FormData')
      } catch (error) {
        console.error('[API /sora/mobile] Error processing reference image:', error)
        return NextResponse.json(
          { error: 'Invalid reference image format' },
          { status: 400 }
        )
      }
    }

    const response = await axios.post(
      'https://api.openai.com/v1/videos',
      soraFormData,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    )

    console.log('[API /sora/mobile] Sora-2 generation response:', response.data)
    
    const generatedVideoId = response.data.id || response.data.video_id
    
    if (!generatedVideoId) {
      return NextResponse.json(
        { error: 'Video ID not found in Sora response' },
        { status: 500 }
      )
    }

    // Возвращаем данные для мобильного приложения
    return NextResponse.json({
      success: true,
      videoId: generatedVideoId,
      status: response.data.status || 'queued',
      model: response.data.model || 'sora-2',
      size: response.data.size || size,
      seconds: response.data.seconds || seconds,
      createdAt: response.data.created_at || Date.now(),
      message: 'Sora-2 video generation started!'
    })

  } catch (error) {
    console.error('[API /sora/mobile] Sora-2 generation error:', error)
    
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to generate video'
      return NextResponse.json(
        { error: errorMessage },
        { status: error.response?.status || 500 }
      )
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate video' },
      { status: 500 }
    )
  }
}

// GET endpoint для получения статуса видео
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')

    if (!videoId) {
      return NextResponse.json(
        { error: 'videoId parameter is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not found' },
        { status: 500 }
      )
    }

    console.log('[API /sora/mobile] Checking video status:', videoId)

    const response = await axios.get(
      `https://api.openai.com/v1/videos/${videoId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    )

    console.log('[API /sora/mobile] Video status response:', response.data)

    return NextResponse.json({
      success: true,
      videoId: response.data.id,
      status: response.data.status,
      progress: response.data.progress || 0,
      downloadUrl: response.data.download_url || null,
      error: response.data.error || null,
      createdAt: response.data.created_at,
      model: response.data.model,
      size: response.data.size,
      seconds: response.data.seconds
    })

  } catch (error) {
    console.error('[API /sora/mobile] Video status check error:', error)
    
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to check video status'
      return NextResponse.json(
        { error: errorMessage },
        { status: error.response?.status || 500 }
      )
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check video status' },
      { status: 500 }
    )
  }
}
