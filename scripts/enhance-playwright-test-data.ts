import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://fonana_user:fonana_pass@localhost:5432/fonana'
    }
  }
})

// Enhanced test user profile
const ENHANCED_PROFILE = {
  id: 'playwright_admin_user',
  nickname: 'playwright_admin',
  fullName: 'Alex Creative',
  bio: '🎨 Digital Artist & Content Creator | 🎵 Music Producer | 💫 AI Art Pioneer\n\nCreating exclusive content for my amazing community! Join different tiers for unique experiences:\n\n✨ Basic: Behind-the-scenes content\n🔥 Premium: Exclusive artworks & tutorials  \n💎 VIP: Personal 1-on-1 sessions\n\nAlways experimenting with new AI tools and creative techniques!',
  website: 'https://alexcreative.art',
  twitter: 'alexcreative_art',
  telegram: 'alexcreative',
  location: 'Los Angeles, CA',
  avatar: '/media/tests/avatars/playwright-admin-avatar.jpg',
  isCreator: true,
  isVerified: true,
  followersCount: 1247,
  followingCount: 156,
  postsCount: 10 // Will be accurate after we create posts
}

// Test posts with different media types and access levels
const TEST_POSTS = [
  {
    id: 'test_post_1',
    title: '🎨 Digital Art Masterpiece - "Neon Dreams"',
    content: 'Finally finished this piece after 20 hours of work! This represents the fusion of traditional art techniques with modern digital tools. The neon aesthetic combined with ethereal elements creates a dreamlike atmosphere.\n\n#DigitalArt #NeonArt #CreativeProcess',
    type: 'image',
    category: 'Art',
    thumbnail: '/media/tests/posts/neon-dreams-thumb.jpg',
    mediaUrl: '/media/tests/posts/neon-dreams-full.jpg',
    isLocked: false,
    isPremium: false,
    minSubscriptionTier: 'free',
    price: null,
    currency: null,
    likesCount: 89,
    commentsCount: 23,
    viewsCount: 445
  },
  {
    id: 'test_post_2', 
    title: '🎵 New Track Preview: "Midnight Vibes"',
    content: 'Working on this chill electronic track! Basic subscribers get the 30-second preview. What do you think of the vibe? Drop your thoughts in the comments!\n\n#MusicProduction #ElectronicMusic #MidnightVibes',
    type: 'audio',
    category: 'Music',
    thumbnail: '/media/tests/posts/midnight-vibes-cover.jpg',
    mediaUrl: '/media/tests/posts/midnight-vibes-preview.mp3',
    isLocked: true,
    isPremium: false,
    minSubscriptionTier: 'basic',
    price: null,
    currency: null,
    likesCount: 156,
    commentsCount: 34,
    viewsCount: 678
  },
  {
    id: 'test_post_3',
    title: '💎 VIP Exclusive: AI Art Tutorial Series',
    content: 'VIP members only! Complete tutorial on how I create my signature AI-assisted artworks. This 45-minute video covers:\n\n• Prompt engineering techniques\n• Style transfer methods\n• Post-processing in Photoshop\n• Color grading secrets\n\nThis is exclusive content that I only share with my VIP community!',
    type: 'video',
    category: 'Education',
    thumbnail: '/media/tests/posts/ai-tutorial-thumb.jpg',
    mediaUrl: '/media/tests/posts/ai-tutorial-full.mp4',
    isLocked: true,
    isPremium: true,
    minSubscriptionTier: 'vip',
    price: null,
    currency: null,
    likesCount: 234,
    commentsCount: 67,
    viewsCount: 1203
  },
  {
    id: 'test_post_4',
    title: '🔥 Premium Art Collection: "Cyber Portraits"',
    content: 'Premium subscribers get exclusive access to my latest portrait series! These 5 cyberpunk-inspired portraits took me 3 weeks to complete. Each piece explores the relationship between humanity and technology.\n\nPremium members can download high-res versions for personal use!',
    type: 'image',
    category: 'Art',
    thumbnail: '/media/tests/posts/cyber-portraits-thumb.jpg', 
    mediaUrl: '/media/tests/posts/cyber-portraits-gallery.jpg',
    isLocked: true,
    isPremium: true,
    minSubscriptionTier: 'premium',
    price: null,
    currency: null,
    likesCount: 312,
    commentsCount: 89,
    viewsCount: 892
  },
  {
    id: 'test_post_5',
    title: '💰 Special Offer: Commission Slot Available!',
    content: 'Limited time offer! I\'m opening ONE commission slot for a custom digital portrait. This includes:\n\n• Personal consultation call\n• 3 revision rounds\n• High-res files (300 DPI)\n• Commercial usage rights\n• Process documentation video\n\nFirst come, first served! 🏃‍♂️',
    type: 'image',
    category: 'Commission',
    thumbnail: '/media/tests/posts/commission-example-thumb.jpg',
    mediaUrl: '/media/tests/posts/commission-example-full.jpg',
    isLocked: true,
    isPremium: false,
    minSubscriptionTier: null,
    price: 0.5,
    currency: 'SOL',
    likesCount: 67,
    commentsCount: 45,
    viewsCount: 523
  },
  {
    id: 'test_post_6',
    title: '🎬 Behind the Scenes: Studio Tour',
    content: 'Take a look inside my creative space! This is where all the magic happens. From my dual monitor setup to my drawing tablet and recording equipment - everything you see in my content starts here.\n\n#StudioTour #CreativeSpace #BehindTheScenes',
    type: 'video',
    category: 'Lifestyle',
    thumbnail: '/media/tests/posts/studio-tour-thumb.jpg',
    mediaUrl: '/media/tests/posts/studio-tour.mp4',
    isLocked: false,
    isPremium: false,
    minSubscriptionTier: 'free',
    price: null,
    currency: null,
    likesCount: 178,
    commentsCount: 56,
    viewsCount: 734
  },
  {
    id: 'test_post_7',
    title: '🎭 Character Design: "The Techno Shaman"',
    content: 'Basic subscribers get early access to my character design process! Meet "The Techno Shaman" - a fusion of ancient wisdom and future technology. This character will be featured in my upcoming NFT collection.\n\nSwipe to see the evolution from sketch to final render!',
    type: 'image',
    category: 'Art',
    thumbnail: '/media/tests/posts/techno-shaman-thumb.jpg',
    mediaUrl: '/media/tests/posts/techno-shaman-process.jpg',
    isLocked: true,
    isPremium: false,
    minSubscriptionTier: 'basic',
    price: null,
    currency: null,
    likesCount: 203,
    commentsCount: 78,
    viewsCount: 654
  },
  {
    id: 'test_post_8',
    title: '🔊 Full Track Release: "Midnight Vibes" (Premium)',
    content: 'Premium members - here\'s the full track! "Midnight Vibes" is now complete and exclusively available for my premium community. This 4-minute journey through electronic soundscapes is perfect for late-night creative sessions.\n\nDownload includes:\n• 320kbps MP3\n• Lossless FLAC\n• Instrumental version',
    type: 'audio',
    category: 'Music',
    thumbnail: '/media/tests/posts/midnight-vibes-full-cover.jpg',
    mediaUrl: '/media/tests/posts/midnight-vibes-full.mp3',
    isLocked: true,
    isPremium: true,
    minSubscriptionTier: 'premium',
    price: null,
    currency: null,
    likesCount: 289,
    commentsCount: 67,
    viewsCount: 1045
  },
  {
    id: 'test_post_9',
    title: '📱 Quick Tip: Photoshop Blend Modes',
    content: 'Free tip for everyone! One of my most-used blend modes for creating dramatic lighting effects is "Linear Dodge (Add)". Try it on a soft brush with warm colors over your subjects.\n\nWant more advanced techniques? Check out my premium tutorials! 🎨',
    type: 'text',
    category: 'Tips',
    thumbnail: null,
    mediaUrl: null,
    isLocked: false,
    isPremium: false,
    minSubscriptionTier: 'free',
    price: null,
    currency: null,
    likesCount: 445,
    commentsCount: 123,
    viewsCount: 2341
  },
  {
    id: 'test_post_10',
    title: '👑 VIP Only: Personal Art Collection Sale',
    content: 'My VIP community gets first access to my personal art collection! I\'m selling 3 original pieces from my private collection. These have never been shown publicly and each comes with a certificate of authenticity.\n\nPieces available:\n1. "Digital Dreams" - Mixed media, 24x36"\n2. "Cyber Soul" - Digital print on canvas, 18x24" \n3. "Future Past" - Acrylic on wood panel, 20x30"\n\nSerious inquiries only. DM me for details! 💎',
    type: 'image',
    category: 'Art',
    thumbnail: '/media/tests/posts/personal-collection-thumb.jpg',
    mediaUrl: '/media/tests/posts/personal-collection-gallery.jpg',
    isLocked: true,
    isPremium: true,
    minSubscriptionTier: 'vip',
    price: 2.5,
    currency: 'SOL',
    likesCount: 156,
    commentsCount: 89,
    viewsCount: 567
  }
]

async function enhancePlaywrightTestData() {
  console.log('🚀 Enhancing Playwright test data...')

  try {
    // Update user profile with enhanced data
    console.log('📝 Updating user profile...')
    await prisma.user.update({
      where: { id: ENHANCED_PROFILE.id },
      data: {
        nickname: ENHANCED_PROFILE.nickname,
        fullName: ENHANCED_PROFILE.fullName,
        bio: ENHANCED_PROFILE.bio,
        website: ENHANCED_PROFILE.website,
        twitter: ENHANCED_PROFILE.twitter,
        telegram: ENHANCED_PROFILE.telegram,
        location: ENHANCED_PROFILE.location,
        avatar: ENHANCED_PROFILE.avatar,
        isCreator: ENHANCED_PROFILE.isCreator,
        isVerified: ENHANCED_PROFILE.isVerified,
        followersCount: ENHANCED_PROFILE.followersCount,
        followingCount: ENHANCED_PROFILE.followingCount,
        postsCount: ENHANCED_PROFILE.postsCount
      }
    })
    console.log('✅ User profile enhanced')

    // Create test posts
    console.log('📮 Creating test posts...')
    for (const post of TEST_POSTS) {
      await prisma.post.upsert({
        where: { id: post.id },
        update: {
          title: post.title,
          content: post.content,
          type: post.type as any,
          category: post.category,
          thumbnail: post.thumbnail,
          mediaUrl: post.mediaUrl,
          isLocked: post.isLocked,
          isPremium: post.isPremium,
          minSubscriptionTier: post.minSubscriptionTier as any,
          price: post.price,
          currency: post.currency || undefined,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          viewsCount: post.viewsCount
        },
        create: {
          id: post.id,
          creatorId: ENHANCED_PROFILE.id,
          title: post.title,
          content: post.content,
          type: post.type as any,
          category: post.category,
          thumbnail: post.thumbnail,
          mediaUrl: post.mediaUrl,
          isLocked: post.isLocked,
          isPremium: post.isPremium,
          minSubscriptionTier: post.minSubscriptionTier as any,
          price: post.price,
          currency: post.currency || undefined,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          viewsCount: post.viewsCount,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random dates within last 30 days
          updatedAt: new Date()
        }
      })
    }
    console.log('✅ Test posts created')

    // Create some test media directories (placeholder files)
    console.log('📁 Creating media structure info...')
    console.log(`
📂 Media files needed (create these manually):
   public/media/tests/
   ├── avatars/
   │   └── playwright-admin-avatar.jpg
   ├── posts/
   │   ├── neon-dreams-thumb.jpg
   │   ├── neon-dreams-full.jpg
   │   ├── midnight-vibes-cover.jpg
   │   ├── midnight-vibes-preview.mp3
   │   ├── ai-tutorial-thumb.jpg
   │   ├── ai-tutorial-full.mp4
   │   ├── cyber-portraits-thumb.jpg
   │   ├── cyber-portraits-gallery.jpg
   │   ├── commission-example-thumb.jpg
   │   ├── commission-example-full.jpg
   │   ├── studio-tour-thumb.jpg
   │   ├── studio-tour.mp4
   │   ├── techno-shaman-thumb.jpg
   │   ├── techno-shaman-process.jpg
   │   ├── midnight-vibes-full-cover.jpg
   │   ├── midnight-vibes-full.mp3
   │   ├── personal-collection-thumb.jpg
   │   └── personal-collection-gallery.jpg
`)

    console.log('🎉 Playwright test data enhancement complete!')
    console.log(`
📊 Created:
   • Enhanced user profile for ${ENHANCED_PROFILE.nickname}
   • ${TEST_POSTS.length} diverse test posts
   • Mix of content types: image, video, audio, text
   • Various access levels: free, basic, premium, vip, paid
   • Realistic engagement metrics
`)

  } catch (error) {
    console.error('❌ Error enhancing test data:', error)
    throw error
  }
}

// Execute enhancement
enhancePlaywrightTestData()
  .then(() => {
    console.log('🏁 Enhancement complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error enhancing test data:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  }) 