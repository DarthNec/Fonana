'use client'

import { useState } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Avatar from '@/components/Avatar'
import { 
  CalendarIcon, 
  MapPinIcon,
  HeartIcon,
  UserPlusIcon,
  ShareIcon,
  PlusIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ChatBubbleLeftIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { CheckBadgeIcon } from '@heroicons/react/24/solid'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { getCreatorById, getPostsByCreator, isUserSubscribedTo, getUserSubscription } from '@/lib/mockData'
import CreatorPosts from '@/components/CreatorPosts'
import CreatorContentUpload from '@/components/CreatorContentUpload'

interface CreatorPageProps {
  params: {
    id: string
  }
}

export default function CreatorPage({ params }: CreatorPageProps) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [refreshPosts, setRefreshPosts] = useState(0)
  
  const creatorId = parseInt(params.id)
  const creator = getCreatorById(creatorId)
  
  // Check if user is subscribed
  const isSubscribed = isUserSubscribedTo(creatorId)
  const userSubscription = getUserSubscription(creatorId)
  
  // Простая проверка - владелец ли текущий пользователь этой страницы
  const isOwner = true // Для демонстрации считаем, что пользователь владелец
  
  if (!creator) {
    notFound()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long'
    })
  }

  const handleContentAdded = () => {
    setShowUploadModal(false)
    setRefreshPosts(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Hero Cover Section */}
      <div className="relative min-h-[500px] lg:min-h-[600px] overflow-hidden">
        {/* Cover Image */}
        <div className="absolute inset-0">
          <Image
            src={creator.coverImage}
            alt={`${creator.name} cover`}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/80"></div>
        </div>

        {/* Floating elements */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>

        {/* Profile Content */}
        <div className="absolute inset-x-0 bottom-0 p-6 lg:p-8 pb-16 lg:pb-24">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col lg:flex-row items-start lg:items-end gap-8">
              {/* Avatar */}
              <div className="relative mx-auto lg:mx-0">
                <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-3xl overflow-hidden border-4 border-white/20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm">
                  <Avatar
                    src={creator.avatar}
                    alt={creator.name}
                    seed={creator.username}
                    size={160}
                    rounded="3xl"
                  />
                </div>
                {/* Online indicator */}
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white/20 flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                </div>
              </div>

              {/* Creator Info */}
              <div className="flex-1 text-white text-center lg:text-left mt-6 lg:mt-0">
                <div className="flex items-center justify-center lg:justify-start gap-3 mb-3">
                  <h1 className="text-4xl lg:text-5xl font-black">
                    {creator.name}
                  </h1>
                  {creator.isVerified && (
                    <CheckBadgeIcon className="w-8 h-8 text-blue-400" />
                  )}
                </div>
                
                <p className="text-xl text-white/80 mb-6">
                  @{creator.username}
                </p>

                <p className="text-lg text-white/90 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  {creator.description}
                </p>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-white/70 mb-8">
                  <div className="flex items-center gap-2">
                    <MapPinIcon className="w-5 h-5" />
                    <span>{creator.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5" />
                    <span>Joined {formatDate(creator.joinedDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StarIcon className="w-5 h-5 text-yellow-400" />
                    <span>{creator.rating} rating</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                  {creator.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 font-medium rounded-full border border-purple-500/30 backdrop-blur-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats & Actions Section */}
      <div className="container mx-auto max-w-6xl px-6 lg:px-8 -mt-16 relative z-10">
        <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-8 mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Subscribers */}
            <div className="text-center group">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <UsersIcon className="w-8 h-8 text-purple-400" />
              </div>
              <div className="text-3xl font-black mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {creator.subscribers.toLocaleString()}
              </div>
              <div className="text-slate-400 font-medium">
                Subscribers
              </div>
            </div>

            {/* Posts */}
            <div className="text-center group">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <ChatBubbleLeftIcon className="w-8 h-8 text-blue-400" />
              </div>
              <div className="text-3xl font-black mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {creator.posts}
              </div>
              <div className="text-slate-400 font-medium">
                Posts
              </div>
            </div>

            {/* Monthly Earnings */}
            <div className="text-center group">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <CurrencyDollarIcon className="w-8 h-8 text-green-400" />
              </div>
              <div className="text-3xl font-black mb-2 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                {creator.monthlyEarnings}
              </div>
              <div className="text-slate-400 font-medium">
                Monthly Earnings
              </div>
            </div>

            {/* Rating */}
            <div className="text-center group">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <StarIcon className="w-8 h-8 text-yellow-400" />
              </div>
              <div className="text-3xl font-black mb-2 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                {creator.rating}
              </div>
              <div className="text-slate-400 font-medium">
                Rating
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            {isOwner ? (
              <>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/25"
                >
                  <PlusIcon className="w-6 h-6" />
                  Upload Content
                </button>
                <Link
                  href="/dashboard"
                  className="flex-1 bg-slate-700/50 backdrop-blur-sm text-slate-300 hover:text-white px-8 py-4 rounded-2xl font-bold border border-slate-600/50 hover:border-slate-500/50 transform hover:scale-105 transition-all duration-300 text-center hover:bg-slate-600/50"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  href={`/creator/${creator.id}/subscribe`}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-2xl font-bold text-center hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/25"
                >
                  Subscribe
                </Link>
                <button className="flex-1 bg-gradient-to-r from-pink-600 to-rose-600 text-white px-8 py-4 rounded-2xl font-bold hover:from-pink-700 hover:to-rose-700 transform hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/25 flex items-center justify-center gap-3">
                  <CurrencyDollarIcon className="w-6 h-6" />
                  Support
                </button>
                <button className="bg-slate-700/50 backdrop-blur-sm text-slate-300 hover:text-white px-8 py-4 rounded-2xl font-bold border border-slate-600/50 hover:border-purple-500/30 transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3 hover:bg-slate-600/50">
                  <ChatBubbleLeftIcon className="w-6 h-6" />
                  Message
                </button>
              </>
            )}
          </div>

          {/* Subscription Status */}
          {isSubscribed && userSubscription && (
            <div className="mt-6 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl">
              <div className="flex items-center gap-3 text-green-400">
                <CheckBadgeIcon className="w-6 h-6" />
                <span className="font-semibold">
                  You are subscribed to plan "{userSubscription.plan}" until {new Date(userSubscription.validUntil).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Content Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-3xl max-w-2xl w-full my-8 border border-slate-700/50">
              <div className="flex items-center justify-between p-8 border-b border-slate-700/50">
                <h3 className="text-2xl font-bold text-white">
                  Upload New Content
                </h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-3 hover:bg-slate-700/50 rounded-2xl transition-colors text-slate-400 hover:text-white"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8">
                <CreatorContentUpload 
                  creatorId={creator.id}
                  onPostCreated={handleContentAdded}
                  onClose={() => setShowUploadModal(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Posts Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-4xl font-black text-white">
              Content from <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{creator.name}</span>
            </h2>
            <div className="flex items-center gap-4 text-slate-400">
              <span>{creator.posts} posts</span>
              {isSubscribed && userSubscription && (
                <span className="px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 rounded-full text-sm font-medium border border-green-500/30">
                  ✓ Subscriber {userSubscription.plan}
                </span>
              )}
            </div>
          </div>

          <CreatorPosts 
            key={refreshPosts}
            creatorId={creator.id} 
            showLocked={true}
            isSubscribed={isSubscribed}
          />
        </div>
      </div>
    </div>
  )
} 