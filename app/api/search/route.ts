import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const type = searchParams.get('type') || 'all' // all | creators | posts
    const category = searchParams.get('category')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const contentType = searchParams.get('contentType') // image | video | audio
    const tier = searchParams.get('tier') // basic | premium | vip
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!query || query.length < 2) {
      return NextResponse.json({ 
        success: false, 
        error: 'Search query must be at least 2 characters long' 
      }, { status: 400 })
    }

    const searchResults: any = {
      creators: [],
      posts: [],
      total: 0
    }

    // Search creators
    if (type === 'all' || type === 'creators') {
      const creatorWhereClause: any = {
        OR: [
          { nickname: { contains: query, mode: 'insensitive' } },
          { fullName: { contains: query, mode: 'insensitive' } },
          { bio: { contains: query, mode: 'insensitive' } }
        ],
        isCreator: true
      }

      searchResults.creators = await prisma.user.findMany({
        where: creatorWhereClause,
        select: {
          id: true,
          nickname: true,
          fullName: true,
          bio: true,
          avatar: true,
          isVerified: true,
          followersCount: true,
          postsCount: true,
          _count: {
            select: {
              subscribers: {
                where: {
                  isActive: true
                }
              }
            }
          }
        },
        take: type === 'creators' ? limit : 10,
        skip: type === 'creators' ? offset : 0
      })
    }

    // Search posts
    if (type === 'all' || type === 'posts') {
      const postWhereClause: any = {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } }
        ]
      }

      // Apply filters
      if (category && category !== 'All') {
        postWhereClause.category = category
      }

      if (contentType) {
        postWhereClause.type = contentType
      }

      if (tier) {
        postWhereClause.minSubscriptionTier = tier
      }

      if (minPrice || maxPrice) {
        postWhereClause.price = {}
        if (minPrice) postWhereClause.price.gte = parseFloat(minPrice)
        if (maxPrice) postWhereClause.price.lte = parseFloat(maxPrice)
      }

      searchResults.posts = await prisma.post.findMany({
        where: postWhereClause,
        include: {
          creator: {
            select: {
              id: true,
              nickname: true,
              fullName: true,
              avatar: true,
              isVerified: true
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true
            }
          }
        },
        orderBy: [
          { viewsCount: 'desc' },
          { likesCount: 'desc' },
          { createdAt: 'desc' }
        ],
        take: type === 'posts' ? limit : 10,
        skip: type === 'posts' ? offset : 0
      })

      // Format posts data
      searchResults.posts = searchResults.posts.map((post: any) => ({
        ...post,
        likes: post._count.likes,
        comments: post._count.comments
      }))
    }

    // Calculate total results
    searchResults.total = searchResults.creators.length + searchResults.posts.length

    return NextResponse.json({
      success: true,
      results: searchResults,
      query,
      filters: {
        type,
        category,
        minPrice,
        maxPrice,
        contentType,
        tier
      }
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to perform search' },
      { status: 500 }
    )
  }
} 