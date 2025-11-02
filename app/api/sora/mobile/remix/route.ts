import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

// POST endpoint для создания remix видео
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      videoId, // ID оригинального видео для ремикса
      prompt   // Промпт для ремикса
    } = body

    console.log('[API /sora/mobile/remix] Starting Sora video remix...', {
      videoId,
      prompt: prompt?.substring(0, 50) + '...'
    })

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required for remix' },
        { status: 400 }
      )
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required for remix' },
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

    // Отправляем запрос на OpenAI API для создания ремикса
    const response = await axios.post(
      `https://api.openai.com/v1/videos/${videoId}/remix`,
      {
        prompt: prompt
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    )

    console.log('[API /sora/mobile/remix] Remix response:', response.data)
    
    const remixVideoId = response.data.id
    
    if (!remixVideoId) {
      return NextResponse.json(
        { error: 'Remix video ID not found in response' },
        { status: 500 }
      )
    }

    // Возвращаем данные для мобильного приложения
    return NextResponse.json({
      success: true,
      videoId: remixVideoId,
      originalVideoId: videoId,
      status: response.data.status || 'queued',
      model: response.data.model || 'sora-2',
      createdAt: response.data.created_at || Date.now(),
      message: 'Sora video remix started!'
    })

  } catch (error) {
    console.error('[API /sora/mobile/remix] Remix error:', error)
    
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to create remix'
      return NextResponse.json(
        { error: errorMessage },
        { status: error.response?.status || 500 }
      )
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create remix' },
      { status: 500 }
    )
  }
}

