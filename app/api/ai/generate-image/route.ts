import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { prompt, style = 'realistic', size = '1024x1024' } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const stabilityApiKey = process.env.STABILITY_API_KEY
    if (!stabilityApiKey) {
      return NextResponse.json({ 
        error: 'Stability AI API key not configured' 
      }, { status: 500 })
    }

    console.log('🎨 Generating image with Stability AI:', { prompt, style, size })

    // Улучшаем промпт в зависимости от стиля
    const enhancedPrompt = enhancePromptByStyle(prompt, style)

    try {
      // Создаем FormData для multipart/form-data запроса
      const formData = new FormData()
      formData.append('prompt', enhancedPrompt)
      formData.append('output_format', 'png')
      formData.append('aspect_ratio', '1:1') // квадратное изображение
      
      // Добавляем negative prompt для лучшего качества
      formData.append('negative_prompt', 'ugly, deformed, blurry, bad anatomy, worst quality, low quality, text, watermark')
      
      // Стиль модели в зависимости от выбранного стиля
      const modelStyle = getStabilityStyle(style)
      if (modelStyle) {
        formData.append('style_preset', modelStyle)
      }

      const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/sd3', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stabilityApiKey}`,
          'Accept': 'image/*'
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Stability AI Error:', response.status, errorData)
        
        return NextResponse.json({ 
          error: 'Failed to generate image with Stability AI',
          details: errorData.message || errorData.error || `HTTP ${response.status}`
        }, { status: response.status })
      }

      // Получаем изображение как buffer
      const imageBuffer = await response.arrayBuffer()
      
      if (!imageBuffer || imageBuffer.byteLength === 0) {
        return NextResponse.json({ 
          error: 'No image data received from Stability AI' 
        }, { status: 500 })
      }

      // Конвертируем в base64 data URL
      const buffer = Buffer.from(imageBuffer)
      const base64Image = `data:image/png;base64,${buffer.toString('base64')}`

      console.log('✅ Image generated successfully with Stability AI SD3')

      return NextResponse.json({
        success: true,
        imageUrl: base64Image,
        prompt: enhancedPrompt,
        style: style,
        model: 'stable-diffusion-3'
      })

    } catch (error) {
      console.error('Stability AI generation error:', error)
      return NextResponse.json({ 
        error: 'Failed to generate image',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Функция для маппинга стилей на Stability AI style presets
function getStabilityStyle(style: string): string | null {
  const styleMap: Record<string, string> = {
    realistic: 'photographic',
    artistic: 'enhance', 
    fantasy: 'fantasy-art',
    anime: 'anime',
    vintage: 'analog-film',
    cyberpunk: 'digital-art'
  }
  
  return styleMap[style] || null
}

// Функция для улучшения промпта в зависимости от стиля
function enhancePromptByStyle(prompt: string, style: string): string {
  const styleEnhancements = {
    realistic: `Professional high-quality realistic portrait: ${prompt}. Photorealistic, detailed, professional lighting, sharp focus.`,
    
    artistic: `Artistic portrait painting: ${prompt}. Oil painting style, artistic interpretation, painterly brushstrokes, creative composition.`,
    
    fantasy: `Fantasy character portrait: ${prompt}. Epic fantasy style, magical atmosphere, detailed armor or clothing, mystical lighting.`,
    
    anime: `Anime style character portrait: ${prompt}. Japanese anime art style, detailed anime features, vibrant colors, clean lines.`,
    
    vintage: `Vintage portrait photograph: ${prompt}. 1950s-1980s vintage photography style, film grain, classic composition, retro aesthetic.`,
    
    cyberpunk: `Cyberpunk character portrait: ${prompt}. Futuristic cyberpunk style, neon lighting, high-tech elements, urban dystopian atmosphere.`
  }

  return styleEnhancements[style as keyof typeof styleEnhancements] || prompt
}
