import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserByWallet } from '@/lib/db'

export const dynamic = 'force-dynamic'

// ID администраторов с правами на удаление любых постов
const ADMIN_IDS = [
  'cmbymuez00004qoe1aeyoe7zf',
  'cmfetoamd001spzkowc5pdygf'
]

/**
 * DELETE /api/posts/[id]/admin-delete
 * Административное удаление поста
 * Администраторы могут удалять любые посты независимо от авторства
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🛡️ [ADMIN DELETE] Request received for post:', params.id)
    
    const { searchParams } = new URL(request.url)
    const userWallet = searchParams.get('userWallet')
    
    console.log('🛡️ [ADMIN DELETE] userWallet from query params:', userWallet)

    if (!userWallet) {
      console.error('🛡️ [ADMIN DELETE] No userWallet provided')
      return NextResponse.json({ error: 'User wallet required' }, { status: 400 })
    }

    // Получаем пользователя по wallet
    const user = await getUserByWallet(userWallet)
    console.log('🛡️ [ADMIN DELETE] User found:', { 
      userId: user?.id, 
      userWallet: user?.wallet 
    })
    
    if (!user) {
      console.error('🛡️ [ADMIN DELETE] User not found for wallet:', userWallet)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Проверяем права администратора
    const isAdmin = ADMIN_IDS.includes(user.id)
    console.log('🛡️ [ADMIN DELETE] Is user admin:', isAdmin, 'userId:', user.id)
    
    if (!isAdmin) {
      console.error('🛡️ [ADMIN DELETE] User is not an administrator:', user.id)
      return NextResponse.json({ 
        error: 'Insufficient permissions. Administrator rights required.' 
      }, { status: 403 })
    }

    // Получаем информацию о посте для логирования
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: { 
        id: true, 
        creatorId: true, 
        title: true,
        creator: {
          select: {
            id: true,
            nickname: true,
            wallet: true
          }
        }
      },
    })

    if (!post) {
      console.error('🛡️ [ADMIN DELETE] Post not found:', params.id)
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    console.log('🛡️ [ADMIN DELETE] Post details:', { 
      postId: post.id, 
      postTitle: post.title,
      postCreatorId: post.creatorId,
      postCreatorNickname: post.creator.nickname,
      adminId: user.id,
      adminWallet: user.wallet
    })

    // Логируем административное действие
    console.log('⚠️ [ADMIN ACTION] Administrator', user.id, 'is deleting post', post.id, 'by', post.creator.nickname)
    
    // Удаляем пост (связанные данные удалятся каскадно)
    await prisma.post.delete({
      where: { id: params.id },
    })

    console.log('🛡️ [ADMIN DELETE] Post deleted successfully by administrator')
    
    // Возвращаем успех с информацией о действии
    return NextResponse.json({ 
      success: true, 
      message: 'Post deleted by administrator',
      details: {
        postId: post.id,
        postTitle: post.title,
        originalCreator: post.creator.nickname,
        deletedBy: user.wallet,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('🛡️ [ADMIN DELETE] Error deleting post:', error)
    return NextResponse.json({ 
      error: 'Failed to delete post',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}







