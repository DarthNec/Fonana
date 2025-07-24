import { NextRequest, NextResponse } from 'next/server'
import { SearchQuerySchema, validateInput } from '@/lib/validation/schemas'
import { prisma } from '@/lib/db'

// 🔒 ENTERPRISE SEARCH API with validation and security
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Extract and validate query parameters
    const q = searchParams.get('q') || ''
    const pageStr = searchParams.get('page') || '1'
    const limitStr = searchParams.get('limit') || '20'
    
    const rawQuery = {
      query: q,
      page: Math.max(1, parseInt(pageStr) || 1),
      limit: Math.min(50, Math.max(1, parseInt(limitStr) || 20))
    }
    
    console.info('[ENTERPRISE API] Search request:', rawQuery)
    
    // Simple validation for now
    if (!rawQuery.query || rawQuery.query.length < 1 || rawQuery.query.length > 200) {
      console.warn('[ENTERPRISE API] Invalid query length:', rawQuery.query?.length)
      return NextResponse.json(
        { error: 'Search query must be 1-200 characters' },
        { status: 400 }
      )
    }
    
    const { query, page, limit } = rawQuery
    const offset = (page - 1) * limit
    
    console.info(`[ENTERPRISE API] Executing search for "${query}" (page ${page}, limit ${limit})`)
    
    // Search in multiple entities with proper SQL injection protection
    const [creators, posts] = await Promise.all([
      // Search creators
      prisma.user.findMany({
        where: {
          OR: [
            { nickname: { contains: query, mode: 'insensitive' } },
            { fullName: { contains: query, mode: 'insensitive' } },
            { bio: { contains: query, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          nickname: true,
          fullName: true,
          bio: true,
          avatar: true,
          isVerified: true
        },
        take: Math.min(limit, 20), // Cap at 20 creators
        skip: offset
      }),
      
      // Search posts (if we have posts table)
      prisma.post.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } }
          ],
          isPublic: true // Only public posts
        },
        select: {
          id: true,
          title: true,
          content: true,
          category: true,
          createdAt: true,
          creatorId: true
        },
        take: Math.min(limit, 20),
        skip: offset
      }).catch(() => []) // Graceful fallback if posts table doesn't exist
    ])
    
    // Format results with type safety
    const results = [
      ...creators.map(creator => ({
        id: creator.id,
        type: 'creator',
        name: creator.nickname || creator.fullName || 'Unknown Creator',
        title: creator.nickname || creator.fullName || 'Unknown Creator',
        description: creator.bio || 'No description available',
        category: 'Creator',
        avatar: creator.avatar,
        verified: creator.isVerified || false
      })),
      ...(posts || []).map(post => ({
        id: post.id,
        type: 'post',
        title: post.title,
        name: post.title,
        description: post.content?.substring(0, 150) + '...' || 'No content available',
        category: post.category || 'Post',
        createdAt: post.createdAt,
        creatorId: post.creatorId
      }))
    ]
    
    // Sort by relevance (simple scoring)
    const scoredResults = results
      .map(result => {
        let score = 0
        const searchLower = query.toLowerCase()
        const titleLower = (result.title || '').toLowerCase()
        const descLower = (result.description || '').toLowerCase()
        
        // Score based on match position and type
        if (titleLower.includes(searchLower)) score += 10
        if (titleLower.startsWith(searchLower)) score += 5
        if (descLower.includes(searchLower)) score += 3
        if (result.type === 'creator') score += 2 // Prioritize creators
        
        return { ...result, _score: score }
      })
      .filter(result => result._score > 0) // Only include relevant results
      .sort((a, b) => b._score - a._score)
      .map(({ _score, ...result }) => result) // Remove internal score
    
    console.info(`[ENTERPRISE API] Search completed: ${scoredResults.length} results found`)
    
    // Return results with metadata
    return NextResponse.json({
      results: scoredResults,
      query,
      page,
      limit,
      total: scoredResults.length,
      hasMore: scoredResults.length === limit
    })
    
  } catch (error) {
    console.error('[ENTERPRISE API] Search error:', error)
    
    return NextResponse.json(
      { 
        error: 'Search failed', 
        message: 'An internal error occurred while searching',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use GET for search' },
    { status: 405 }
  )
} 