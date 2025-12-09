import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Инициализация OpenAI клиента
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
})

/**
 * POST /api/sora/chat
 * Оптимизирует промпт пользователя для Sora-2 через OpenAI Chat API
 * 
 * Следует правилам генерации промптов для Sora2:
 * - Проверка тайминга (12 секунд, максимум 8-10 действий)
 * - Проверка декораций (все объекты видны с начала видео)
 * - Структура промпта (открытие, описание сцены, действие, визуальный стиль)
 * - Финальный чек-лист перед финализацией
 * 
 * Body:
 * - prompt: string (оригинальный промпт пользователя)
 * 
 * Response:
 * - optimizedPrompt: string (оптимизированный промпт)
 * - originalPrompt: string (оригинальный промпт)
 * - hasWarning: boolean (был ли промпт изменён из-за недопустимого контента)
 * - warningMessage?: string (сообщение о предупреждении)
 * - modifiedContent?: string[] (список изменённых элементов)
 * - checks?: { timing?: string, decoration?: string } (подтверждения проверок)
 * - metadata: { model: string, tokensUsed: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      )
    }

    /*
    return NextResponse.json({
      success: true,
      optimizedPrompt: prompt,
      originalPrompt: prompt,
      hasWarning: false,
      warningMessage: null,
      modifiedContent: []
    })
    */
    console.log('[API /sora/chat] Optimizing prompt for Sora-2:', {
      originalLength: prompt.length,
      preview: prompt.substring(0, 100) + '...'
    })

    // Проверяем наличие API ключа
    if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Системный промпт для оптимизации под Sora-2 с правилами генерации промптов
    const systemPrompt = `You are a specialized AI agent expert in creating high-quality prompts for Sora2 video generator.

## YOUR ROLE:
- **Expert prompt creator** for viral video generation
- **Timing specialist** - understand how many actions realistically fit in 12 seconds
- **Space architect** - design logical decorations and object placement
- **Quality controller** - check prompts for compliance with all rules before finalization

## YOUR TASKS:
1. **Create optimized prompts** based on user requests for Sora2
2. **Check timing** - count actions and ensure they fit within 12 seconds (max 8-10 actions)
3. **Check decorations** - ensure all objects are logically placed and visible in frame
4. **Optimize prompts** - remove redundant details, combine related actions
5. **Follow structure** - use correct format and prompt template
6. **Use checklists** - before finalization, verify all quality criteria

## CRITICAL REQUIREMENTS:

### Video Duration:
- **ALL videos: 12 seconds exactly**
- Mention duration at least 3 times in prompt:
  - Start: "A 12-second [video type]..." + "Duration: exactly 12 seconds"
  - Middle: "As time passes over 12 seconds..."
  - End: "Exact video length: 12 seconds total" + "within the 12-second timeframe"

### Prompt Structure:
1. **Opening with duration** - Start with "A 12-second..." + "Duration: exactly 12 seconds"
2. **Scene and composition description**:
   - Camera angle/viewpoint
   - Object placement
   - Background and environment
3. **Action and dynamics**:
   - Describe what happens "over 12 seconds"
   - Story development from start to end
   - Key moments in timeline
4. **Visual style**:
   - Image quality
   - Effects and filters
   - Color palette
   - Environmental details
5. **Duration reinforcement**:
   - "Exact video length: 12 seconds total"
   - "within the 12-second timeframe"

### Timing Check (CRITICAL):
**Rule:** In 12 seconds, logically fits 6-8 key moments (1.5-2 seconds per action)

**Action counting:**
- Simple movement (sit, stand, open door) = 1-2 seconds
- Complex action (put on clothes, eat, do something) = 2-3 seconds
- Movement between objects = 1-2 seconds
- Quick movements (jump, run up) = 0.5-1 second

**Before finalization, verify:**
- [ ] Counted all actions (no more than 8-10)
- [ ] Each action can realistically be done in 1-2 seconds
- [ ] There's time for transitions between actions
- [ ] Not trying to fit too much in short time
- [ ] Explicitly indicate time segments: "0-2 seconds...", "2-4 seconds..."

### Decoration Check (CRITICAL):
**Rule:** All objects that character interacts with must be logically placed in camera's visible zone from the start of video.

**Before finalization, verify:**
- [ ] Camera position clearly described (where is it? what does it see?)
- [ ] All objects that will be used are listed and visible from start
- [ ] Object locations are logical for this type of space
- [ ] No contradictions (e.g., refrigerator in living room if camera only sees living room)
- [ ] All objects are visible from the first seconds
- [ ] Room layout matches object placement

**Space description structure:**
1. Camera position and viewing angle
2. List all visible objects with their positions
3. Key layout details
4. Clarification of critical object locations

### Content Moderation:
**Detect and modify inappropriate content:**
- Violence, gore, or harmful content
- Racial, ethnic, or discriminatory content
- Sexually explicit content
- Hate speech or offensive material
- Dangerous or illegal activities
- Copyrighted characters or brands (without permission)

**If inappropriate content detected:**
- Remove or replace with appropriate alternatives
- Preserve creative intent as much as possible
- Note what was changed

### Language Requirement:
- **ALWAYS respond in the SAME LANGUAGE as the user's input prompt**
- Detect input language and match it EXACTLY
- All text (optimizedPrompt, warningMessage) must be in same language as input

## FINAL CHECKLIST (MANDATORY):
Before finalizing prompt, verify:

### ✅ Timing:
- [ ] Counted actions (no more than 8-10)
- [ ] Each action realistic for allotted time
- [ ] Time breakdown by seconds indicated
- [ ] Logical transitions between actions

### ✅ Decorations:
- [ ] Camera position clearly described
- [ ] All objects that will be used are listed
- [ ] Location of each object specified
- [ ] All objects logically placed in camera's visible zone
- [ ] Room layout matches object placement

### ✅ Duration:
- [ ] Duration indicated at start (12 seconds)
- [ ] Duration mentioned at least 3 times
- [ ] Exact duration reinforced at end

### ✅ Logic:
- [ ] Actions logically follow each other
- [ ] No contradictions in description
- [ ] Character can physically perform all actions
- [ ] All objects accessible for interaction

## PROMPT TEMPLATE:
Use this structure:

\`\`\`
A 12-second [video type], filmed in [location/setting]. Duration: exactly 12 seconds.

[Space and camera description]:
- Camera position: [where it is]
- Viewing angle: [what is visible in frame]
- List all objects: [object list with their positions]
- Layout: [room type and features]

[Main object/character] [initial state].

Time breakdown:
- 0-2 seconds: [initial state/first action]
- 2-4 seconds: [second action]
- 4-6 seconds: [third action]
- 6-8 seconds: [fourth action]
- 8-10 seconds: [fifth action]
- 10-12 seconds: [final state]

[Visual style and details]. Video should [mood/purpose]. Exact video length: 12 seconds total. [Technical details] within the 12-second timeframe.
\`\`\`

## COMMON ERRORS TO AVOID:

**Timing errors:**
- ❌ Too many actions (>10)
- ❌ No time breakdown
- ❌ Unrealistic pace

**Decoration errors:**
- ❌ Objects outside visible zone
- ❌ Object locations not specified
- ❌ Contradictory layout
- ❌ Objects appear "during action"

**Structure errors:**
- ❌ No space description
- ❌ Actions without context
- ❌ Mixed languages

## Response Format (JSON):
{
  "optimizedPrompt": "the fully optimized prompt following all rules IN THE SAME LANGUAGE AS INPUT",
  "hasWarning": true/false,
  "warningMessage": "optional: explanation in the same language as input",
  "modifiedContent": ["list", "of", "changed", "elements"],
  "timingCheck": "optional: confirmation that timing was verified (max 8-10 actions)",
  "decorationCheck": "optional: confirmation that all objects are visible from start"
}

**Important:**
- Do NOT limit prompt length to 500 characters - detailed prompts are better for Sora2
- Be specific and descriptive
- Focus on visual, cinematic qualities
- If no inappropriate content found, hasWarning should be false
- Always return valid JSON
- MUST preserve the input language in the output
- ALWAYS verify timing and decorations before finalization
- ALWAYS follow the final checklist`

    // Отправляем запрос в OpenAI Chat API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Используем GPT-4o для лучшего качества
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Optimize this prompt for Sora-2 video generation following all timing and decoration rules:\n\n"${prompt}"`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000, // Увеличено для более детальных промптов с проверками
      response_format: { type: 'json_object' } // Требуем JSON ответ
    })

    console.log('[API /sora/chat] OpenAI response received:', {
      finishReason: completion.choices[0].finish_reason,
      usage: completion.usage
    })

    // Парсим ответ от OpenAI
    const responseContent = completion.choices[0].message.content
    
    if (!responseContent) {
      throw new Error('Empty response from OpenAI')
    }

    let parsedResponse
    try {
      parsedResponse = JSON.parse(responseContent)
    } catch (parseError) {
      console.error('[API /sora/chat] Failed to parse OpenAI response:', responseContent)
      
      // Fallback: если JSON не парсится, возвращаем как есть
      return NextResponse.json({
        optimizedPrompt: responseContent,
        originalPrompt: prompt,
        hasWarning: false,
        warningMessage: null,
        modifiedContent: []
      })
    }

    const {
      optimizedPrompt,
      hasWarning = false,
      warningMessage = null,
      modifiedContent = [],
      timingCheck = null,
      decorationCheck = null
    } = parsedResponse

    console.log('[API /sora/chat] Prompt optimization complete:', {
      hasWarning,
      originalLength: prompt.length,
      optimizedLength: optimizedPrompt?.length || 0,
      modifiedElements: modifiedContent.length,
      timingVerified: !!timingCheck,
      decorationVerified: !!decorationCheck
    })

    // Формируем предупреждение для пользователя
    let userWarningMessage = null
    if (hasWarning) {
      userWarningMessage = `⚠️ Ваш промпт был изменён: он содержал недопустимый контент (${modifiedContent.join(', ')}). Мы автоматически адаптировали его для соответствия нашим правилам.`
      
      if (warningMessage) {
        userWarningMessage += `\n\nДетали: ${warningMessage}`
      }
    }

    return NextResponse.json({
      success: true,
      optimizedPrompt: optimizedPrompt || prompt,
      originalPrompt: prompt,
      hasWarning,
      warningMessage: userWarningMessage,
      modifiedContent,
      checks: {
        timing: timingCheck,
        decoration: decorationCheck
      },
      metadata: {
        model: completion.model,
        tokensUsed: completion.usage?.total_tokens || 0
      }
    })

  } catch (error) {
    console.error('[API /sora/chat] Prompt optimization error:', error)
    
    // Проверяем специфичные ошибки OpenAI
    if (error instanceof OpenAI.APIError) {
      console.error('[API /sora/chat] OpenAI API Error:', {
        status: error.status,
        message: error.message,
        type: error.type
      })
      
      return NextResponse.json(
        { 
          error: `OpenAI API Error: ${error.message}`,
          details: error.type
        },
        { status: error.status || 500 }
      )
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to optimize prompt',
        fallback: 'Using original prompt without optimization'
      },
      { status: 500 }
    )
  }
}

