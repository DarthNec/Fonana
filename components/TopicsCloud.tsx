'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FireIcon, SparklesIcon, ChartBarIcon } from '@heroicons/react/24/solid'

const topics = [
  { name: 'DeFi', count: 234, color: 'indigo', popular: true },
  { name: 'NFT', count: 189, color: 'purple', popular: true },
  { name: 'GameFi', count: 156, color: 'green', popular: false },
  { name: 'Trading', count: 298, color: 'blue', popular: true },
  { name: 'Web3', count: 167, color: 'cyan', popular: false },
  { name: 'Intimate', count: 156, color: 'pink', popular: false, premium: true },
  { name: 'Blockchain', count: 134, color: 'gray', popular: false },
  { name: 'Metaverse', count: 78, color: 'violet', popular: false },
  { name: 'DAO', count: 92, color: 'emerald', popular: false },
  { name: 'P2E', count: 145, color: 'orange', popular: false },
  { name: 'Analytics', count: 203, color: 'red', popular: true },
  { name: 'Education', count: 187, color: 'amber', popular: false },
  { name: 'Investing', count: 245, color: 'teal', popular: true },
  { name: 'Lifestyle', count: 89, color: 'rose', popular: false, premium: true },
  { name: 'Startups', count: 98, color: 'lime', popular: false },
  { name: 'Technology', count: 176, color: 'slate', popular: false }
]

const colorClasses = {
  indigo: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300',
  purple: 'bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300',
  green: 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300',
  blue: 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
  cyan: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300',
  pink: 'bg-pink-100 text-pink-800 hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-300',
  gray: 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300',
  violet: 'bg-violet-100 text-violet-800 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-300',
  emerald: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
  orange: 'bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300',
  red: 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300',
  amber: 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
  teal: 'bg-teal-100 text-teal-800 hover:bg-teal-200 dark:bg-teal-900/30 dark:text-teal-300',
  rose: 'bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300',
  lime: 'bg-lime-100 text-lime-800 hover:bg-lime-200 dark:bg-lime-900/30 dark:text-lime-300',
  slate: 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
}

export default function TopicsCloud({ onTopicSelect }: { onTopicSelect?: (topic: string) => void }) {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)

  const handleTopicClick = (topicName: string) => {
    const newTopic = selectedTopic === topicName ? null : topicName
    setSelectedTopic(newTopic)
    onTopicSelect?.(newTopic || '')
  }

  const getFontSize = (count: number) => {
    if (count > 250) return 'text-2xl'
    if (count > 200) return 'text-xl'
    if (count > 150) return 'text-lg'
    if (count > 100) return 'text-base'
    return 'text-sm'
  }

  const sortedTopics = [...topics].sort((a, b) => {
    // Сначала популярные, потом по количеству
    if (a.popular && !b.popular) return -1
    if (!a.popular && b.popular) return 1
    return b.count - a.count
  })

  return (
    <section className="section-padding bg-gradient-to-br from-gray-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="container-modern">
        <div className="text-center mb-12">
          <h2 className="heading-lg mb-4">
            Explore by Topics
          </h2>
          <p className="text-xl text-muted max-w-3xl mx-auto">
            Find creators in topics that interest you. From DeFi to intimate content — 
            select a topic and discover talented content creators.
          </p>
        </div>

        {/* Топ категории */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <FireIcon className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Trending Now
            </h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {sortedTopics
              .filter(topic => topic.popular)
              .map((topic) => (
                <button
                  key={topic.name}
                  onClick={() => handleTopicClick(topic.name)}
                  className={`
                    inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-200 transform hover:scale-105
                    ${selectedTopic === topic.name 
                      ? 'ring-2 ring-indigo-500 shadow-lg bg-indigo-600 text-white' 
                      : ''
                    }
                    ${selectedTopic === topic.name 
                      ? '' 
                      : colorClasses[topic.color as keyof typeof colorClasses]
                    }
                    ${getFontSize(topic.count)}
                  `}
                >
                                      {topic.popular && <ChartBarIcon className="w-4 h-4" />}
                  {topic.premium && <SparklesIcon className="w-4 h-4" />}
                  <span>{topic.name}</span>
                  <span className="text-xs opacity-75 bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-full">
                    {topic.count}
                  </span>
                </button>
              ))}
          </div>
        </div>

        {/* Облако всех тегов */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            All Categories
          </h3>
          <div className="flex flex-wrap gap-3 justify-center">
            {sortedTopics.map((topic, index) => (
              <button
                key={topic.name}
                onClick={() => handleTopicClick(topic.name)}
                className={`
                  inline-flex items-center gap-2 px-3 py-2 rounded-full font-medium transition-all duration-200 transform hover:scale-105
                  ${selectedTopic === topic.name 
                    ? 'ring-2 ring-indigo-500 shadow-lg bg-indigo-600 text-white' 
                    : ''
                  }
                  ${selectedTopic === topic.name 
                    ? '' 
                    : colorClasses[topic.color as keyof typeof colorClasses]
                  }
                  ${getFontSize(topic.count)}
                `}
                style={{
                  animationDelay: `${index * 100}ms`
                }}
              >
                {topic.premium && <SparklesIcon className="w-4 h-4" />}
                <span>{topic.name}</span>
                <span className="text-xs opacity-75 bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-full">
                  {topic.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Премиум секция */}
        <div className="modern-card p-6 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 border-pink-200 dark:border-pink-800">
          <div className="flex items-center gap-3 mb-4">
            <SparklesIcon className="w-6 h-6 text-pink-500" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Exclusive Content
            </h3>
            <span className="badge badge-primary">Premium</span>
          </div>
          <p className="text-muted mb-4">
            Discover intimate and lifestyle content from talented creators. 
            Artistry, beauty, and exclusivity in every moment.
          </p>
          <div className="flex flex-wrap gap-2">
            {topics
              .filter(topic => topic.premium)
              .map((topic) => (
                <button
                  key={topic.name}
                  onClick={() => handleTopicClick(topic.name)}
                  className={`
                    inline-flex items-center gap-2 px-3 py-2 rounded-full font-medium transition-all duration-200 transform hover:scale-105
                    ${selectedTopic === topic.name 
                      ? 'ring-2 ring-pink-500 shadow-lg bg-pink-600 text-white' 
                      : ''
                    }
                    ${selectedTopic === topic.name 
                      ? '' 
                      : colorClasses[topic.color as keyof typeof colorClasses]
                    }
                  `}
                >
                  <SparklesIcon className="w-4 h-4" />
                  <span>{topic.name}</span>
                  <span className="text-xs opacity-75 bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-full">
                    {topic.count}
                  </span>
                </button>
              ))}
          </div>
        </div>

        {/* Активный фильтр */}
        {selectedTopic && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full">
              <span>Showing creators for topic:</span>
              <span className="font-semibold">{selectedTopic}</span>
              <button
                onClick={() => handleTopicClick(selectedTopic)}
                className="ml-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
} 