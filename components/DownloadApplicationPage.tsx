'use client'

import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

export default function DownloadApplicationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 dark:from-black dark:via-purple-900/5 dark:to-black overflow-hidden">
      {/* Back Button */}
      <div className="container mx-auto px-4 py-6">
        <Link href="/" className="inline-flex items-center text-gray-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back to home
        </Link>
      </div>

      <div className="container mx-auto px-4 py-20">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-7xl font-black mb-6">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Download Fonana
              </span>
            </h1>
            <p className="text-xl text-gray-700 dark:text-slate-300 max-w-2xl mx-auto">
              Get the mobile app and start creating on the go
            </p>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Platform Logos */}
            <div className="space-y-8">
              {/* Google Play */}
              <a
                href="https://play.google.com/store/apps/details?id=com.fonana"
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white dark:bg-slate-900 rounded-3xl p-8 border border-gray-200 dark:border-slate-700 hover:border-blue-500/50 hover:shadow-2xl transition-all duration-300 shadow-lg"
              >
                <div className="flex items-center gap-6">
                  {/* Google Play Logo */}
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 via-green-500 to-yellow-500 flex items-center justify-center">
                      <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3,20.5V3.5C3,2.91,3.34,2.39,3.84,2.15L13.69,12L3.84,21.85C3.34,21.6,3,21.09,3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08,20.75,11.5,20.75,12C20.75,12.5,20.53,12.9,20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      Google Play
                    </h3>
                    <p className="text-gray-600 dark:text-slate-400 mb-4">
                      Download from Google Play Store
                    </p>
                    <div className="inline-flex items-center bg-black text-white px-6 py-3 rounded-xl font-semibold hover:scale-105 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300">
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3,20.5V3.5C3,2.91,3.34,2.39,3.84,2.15L13.69,12L3.84,21.85C3.34,21.6,3,21.09,3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08,20.75,11.5,20.75,12C20.75,12.5,20.53,12.9,20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                      </svg>
                      Get it on Google Play
                    </div>
                  </div>
                </div>
              </a>

              {/* Apple */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-gray-200 dark:border-slate-700 opacity-60">
                <div className="flex items-center gap-6">
                  {/* Apple Logo */}
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                      <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05,20.28c-0.98,0.95-2.05,0.8-3.08,0.35c-1.09-0.46-2.09-0.48-3.24,0c-1.44,0.62-2.2,0.44-3.06-0.35 C2.79,15.25,3.51,7.59,9.05,7.31c1.35,0.07,2.29,0.74,3.08,0.8c1.18-0.24,2.31-0.93,3.57-0.84c1.51,0.12,2.65,0.72,3.4,1.8 c-3.12,1.87-2.38,5.98,0.48,7.13c-0.57,1.5-1.31,2.99-2.54,4.09L17.05,20.28z M12.03,7.25c-0.15-2.23,1.66-4.07,3.74-4.25 c0.29,2.58-2.34,4.5-3.74,4.25z"/>
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      iOS (iPhone & iPad)
                    </h3>
                    <p className="text-gray-600 dark:text-slate-400 mb-4">
                      In development, will be available soon
                    </p>
                    <button disabled className="bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-slate-500 px-6 py-3 rounded-xl font-semibold cursor-not-allowed">
                      Coming Soon
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Phone Mockup */}
            <div className="flex justify-center items-center">
              <div className="relative">
                {/* Phone mockup with rotation */}
                <div 
                  className="relative w-[300px] h-[600px] transform rotate-[15deg] hover:rotate-[0deg] transition-transform duration-500"
                  style={{
                    perspective: '1000px',
                  }}
                >
                  {/* Phone frame */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800 rounded-[3rem] shadow-2xl border-8 border-gray-900 overflow-hidden">
                    {/* Screen */}
                    <div className="absolute inset-2 bg-gradient-to-br from-purple-600 via-pink-500 to-purple-600 rounded-[2.5rem] flex items-center justify-center overflow-hidden">
                      {/* Fonana Logo on screen */}
                      <div className="relative z-10">
                        <div className="text-6xl font-black text-white mb-4 text-center">
                          FONANA
                        </div>
                        <p className="text-white/80 text-center text-sm">
                          Web3 Creator Platform
                        </p>
                      </div>
                      
                      {/* Animated background circles */}
                      <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
                      <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                    </div>
                    
                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-3xl"></div>
                  </div>
                  
                  {/* Glow effect */}
                  <div className="absolute -inset-4 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-[4rem] blur-2xl -z-10"></div>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Section (Optional for future) */}
          {/*
          <div className="mt-20 text-center">
            <div className="inline-block bg-white dark:bg-slate-900 rounded-3xl p-8 border border-gray-200 dark:border-slate-700">
              <p className="text-gray-600 dark:text-slate-400 mb-4">
                Stay tuned for updates
              </p>
              <div className="flex gap-4 justify-center">
                <a 
                  href="https://twitter.com/fonana" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                >
                  Follow us on Twitter
                </a>
                <span className="text-gray-400">•</span>
                <a 
                  href="https://t.me/fonana" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                >
                  Join Telegram
                </a>
              </div>
            </div>
          </div>
          */}
        </div>
      </div>
    </div>
  )
}

