import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Инициализируем OpenAI клиент с webhook secret
const client = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  webhookSecret: process.env.OPENAI_WEBHOOK_SECRET 
})

// POST /api/webhooks/openai - обработка вебхука от OpenAI
export async function POST(request: NextRequest) {
  try {
    // Получаем raw body как текст для верификации подписи
    const body = await request.text()
    const headers = Object.fromEntries(request.headers.entries())

    console.log('[OpenAI Webhook] Received webhook')

    // Верифицируем и разворачиваем вебхук
    const event = await client.webhooks.unwrap(body, headers)

    console.log('[OpenAI Webhook] Event type:', event.type)

    // Обрабатываем событие response.completed
    if (event.type === 'response.completed') {
      const response_id = event.data.id
      console.log('[OpenAI Webhook] Response completed:', response_id)

      // Получаем полный response
      const response = await client.responses.retrieve(response_id)
      
      // Извлекаем текст из output
      const output_text = response.output
        .filter((item: any) => item.type === 'message')
        .flatMap((item: any) => item.content)
        .filter((contentItem: any) => contentItem.type === 'output_text')
        .map((contentItem: any) => contentItem.text)
        .join('')

      console.log('[OpenAI Webhook] Response output:', output_text)

      // Здесь можно обновить статус генерации в базе данных
      // Например, найти запись по requestId и обновить статус
      try {
        const aiCreation = await prisma.aI_Creations.findFirst({
          where: { requestId: response_id }
        })

        if (aiCreation) {
          await prisma.aI_Creations.update({
            where: { id: aiCreation.id },
            data: { 
              status: 'completed'
            }
          })
          console.log('[OpenAI Webhook] Updated AI creation status:', aiCreation.id)
        }
      } catch (dbError) {
        console.error('[OpenAI Webhook] Database error:', dbError)
      }
    }

    // Обрабатываем другие типы событий
    if (event.type === 'response.failed') {
      const response_id = event.data.id
      console.log('[OpenAI Webhook] Response failed:', response_id)

      try {
        const aiCreation = await prisma.aI_Creations.findFirst({
          where: { requestId: response_id }
        })

        if (aiCreation) {
          await prisma.aI_Creations.update({
            where: { id: aiCreation.id },
            data: { 
              status: 'failed'
            }
          })
          console.log('[OpenAI Webhook] Updated AI creation status to failed:', aiCreation.id)
        }
      } catch (dbError) {
        console.error('[OpenAI Webhook] Database error:', dbError)
      }
    }

    return NextResponse.json({ received: true }, { status: 200 })

  } catch (error) {
    if (error instanceof OpenAI.InvalidWebhookSignatureError) {
      console.error('[OpenAI Webhook] Invalid signature:', error)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    console.error('[OpenAI Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

