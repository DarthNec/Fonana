import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const type = searchParams.get('type') || 'all' // all | creators | posts

    if (!query || query.length < 1) {
      return NextResponse.json({ 
        success: false, 
        error: 'Search query is required' 
      }, { status: 400 })
    }

    const suggestions: any = {
      creators: [],
      posts: [],
      categories: [],
      total: 0
    }

    // Search creators for autocomplete
    if (type === 'all' || type === 'creators') {
      suggestions.creators = await prisma.user.findMany({
        where: {
          OR: [
            { nickname: { contains: query, mode: 'insensitive' } },
            { fullName: { contains: query, mode: 'insensitive' } }
          ],
          isCreator: true
        },
        select: {
          id: true,
          nickname: true,
          fullName: true,
          avatar: true,
          isVerified: true
        },
        take: 5
      })
    }

    // Search posts for autocomplete
    if (type === 'all' || type === 'posts') {
      suggestions.posts = await prisma.post.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          title: true,
          type: true,
          creator: {
            select: {
              nickname: true
            }
          }
        },
        take: 5
      })
    }

    // Search categories
    const categories = ['Art', 'Music', 'Gaming', 'Lifestyle', 'Fitness', 
                       'Tech', 'DeFi', 'NFT', 'Trading', 'GameFi', 
                       'Blockchain', 'Intimate', 'Education', 'Comedy']
    
    suggestions.categories = categories
      .filter(cat => cat.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 3)

    // Calculate total suggestions
    suggestions.total = suggestions.creators.length + suggestions.posts.length + suggestions.categories.length

    return NextResponse.json({
      success: true,
      suggestions,
      query
    })

  } catch (error) {
    console.error('Autocomplete error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get suggestions' },
      { status: 500 }
    )
  }
} 