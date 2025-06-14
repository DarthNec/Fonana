'use client'

import { useState } from 'react'
import { Post, getPostsByCreator, isUserSubscribedTo, getUserSubscription, getCreatorById } from '@/lib/mockData'
import PostCard from './PostCard'

interface CreatorPostsProps {
  creatorId: number
  showLocked?: boolean
  isSubscribed?: boolean
}

export default function CreatorPosts({ creatorId, showLocked = true, isSubscribed = false }: CreatorPostsProps) {
  // Use actual subscription check
  const actualIsSubscribed = isUserSubscribedTo(creatorId)
  const userSubscription = getUserSubscription(creatorId)
  const creator = getCreatorById(creatorId)
  
  console.log(`🎬 CreatorPosts rendered for creator ${creatorId}`)
  console.log(`📝 Prop isSubscribed: ${isSubscribed}`)
  console.log(`🔍 Actual isSubscribed: ${actualIsSubscribed}`)
  console.log(`📋 User subscription:`, userSubscription)
  
  // Use actual subscription check
  const finalIsSubscribed = actualIsSubscribed
  
  const [selectedTag, setSelectedTag] = useState<string>('All')
  
  const allPosts = getPostsByCreator(creatorId)
  // Show all posts
  const posts = allPosts
  
  // Get unique tags
  const allTags = ['All', ...Array.from(new Set(posts.flatMap(post => post.tags)))]
  
  // Filter posts by tag
  const filteredPosts = selectedTag === 'All' 
    ? posts 
    : posts.filter(post => post.tags.includes(selectedTag))

  if (!creator) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Creator not found</p>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">No posts yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tags filter */}
      {allTags.length > 1 && (
        <div className="flex flex-wrap gap-3 mb-6">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                selectedTag === tag
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white border border-slate-600/50 hover:border-purple-500/30'
              }`}
            >
              {tag === 'All' ? 'All Posts' : `#${tag}`}
            </button>
          ))}
        </div>
      )}

      {/* Post counter */}
      <div className="flex items-center justify-between text-sm mb-8">
        <div className="text-slate-400">
          <span className="text-white font-semibold">{filteredPosts.length}</span> {filteredPosts.length === 1 ? 'post' : 'posts'}
          {selectedTag !== 'All' && (
            <span className="ml-2 px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
              #{selectedTag}
            </span>
          )}
        </div>
        <div className="text-slate-500">
          🔒 {filteredPosts.filter(p => p.isLocked && !finalIsSubscribed).length} exclusive posts
        </div>
      </div>

      {/* Posts grid */}
      <div className="space-y-6">
        {filteredPosts.map((post) => (
          <PostCard
            key={post.id}
            id={post.id}
            creator={{
              id: creator.id.toString(),
              name: creator.name,
              username: creator.username,
              avatar: creator.avatar,
              isVerified: creator.isVerified
            }}
            title={post.title}
            content={post.content}
            image={post.thumbnail}
            type={post.type}
            isLocked={post.isLocked}
            price={post.price}
            currency={post.currency}
            likes={post.likes}
            comments={post.comments}
            createdAt={post.createdAt}
            tags={post.tags}
            isPremium={post.isLocked && (post.price || 0) > 0.05}
            isSubscribed={finalIsSubscribed}
            showCreator={false} // Don't show creator since we're already on their page
          />
        ))}
      </div>

      {/* CTA for subscription to locked content */}
      {filteredPosts.some(p => p.isLocked) && !finalIsSubscribed && (
        <div className="relative group mt-12 overflow-hidden rounded-3xl">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-purple-600/20 opacity-50"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm"></div>
          
          {/* Floating elements */}
          <div className="absolute top-4 right-4 w-20 h-20 bg-purple-500/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-4 left-4 w-16 h-16 bg-pink-500/10 rounded-full blur-xl"></div>
          
          <div className="relative z-10 p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center border border-purple-500/30">
                <span className="text-3xl">🔓</span>
              </div>
              
              <h3 className="text-2xl font-black text-white mb-3">
                Unlock exclusive content!
              </h3>
              
              <p className="text-slate-300 mb-6 leading-relaxed">
                Get access to {filteredPosts.filter(p => p.isLocked).length}+ premium posts with secret strategies and insider information from{' '}
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-semibold">
                  {creator.name}
                </span>
              </p>
              
              <button className="group/btn">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-2xl font-bold transform group-hover/btn:scale-105 transition-all duration-300 flex items-center gap-3 hover:shadow-xl hover:shadow-purple-500/25">
                  <span>Subscribe now</span>
                  <span className="text-xl">✨</span>
                </div>
              </button>
              
              <div className="mt-4 text-slate-400 text-sm">
                Starting from <span className="text-purple-400 font-semibold">5 SOL</span> per month
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 