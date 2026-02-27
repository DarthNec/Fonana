'use client'

export default function DownloadApplicationPage() {
  return (
    <div className="bg-gray-50 dark:bg-slate-900 pb-20 md:pb-0">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 md:mb-16">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black mb-3 md:mb-6">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Download Fonana
              </span>
            </h1>
            <p className="text-base md:text-xl text-gray-700 dark:text-slate-300 max-w-2xl mx-auto px-4 mb-8 md:mb-10">
              Get the mobile app and start creating on the go
            </p>
            
            {/* Benefits List */}
            <div className="max-w-lg mx-auto px-6 text-left">
              <ul className="space-y-3 md:space-y-4">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 md:w-7 md:h-7 rounded-full bg-purple-500 flex items-center justify-center mt-0.5">
                    <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-sm md:text-base text-gray-700 dark:text-slate-300">
                    <strong className="font-semibold">Always at your fingertips</strong> – Stay connected with your community wherever you are
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 md:w-7 md:h-7 rounded-full bg-pink-500 flex items-center justify-center mt-0.5">
                    <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-sm md:text-base text-gray-700 dark:text-slate-300">
                    <strong className="font-semibold">Create & monetize</strong> – Share your content and earn directly from your phone
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 md:w-7 md:h-7 rounded-full bg-purple-500 flex items-center justify-center mt-0.5">
                    <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-sm md:text-base text-gray-700 dark:text-slate-300">
                    <strong className="font-semibold">Web3 powered</strong> – Full power of blockchain technology optimized for mobile
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Download Cards */}
          <div className="max-w-3xl mx-auto space-y-4 md:space-y-6 px-4 md:px-6">
            {/* Google Play */}
            <a
              href="https://play.google.com/store/apps/details?id=com.fonana"
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white dark:bg-slate-800 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-gray-200 dark:border-slate-700 hover:border-blue-500/50 hover:shadow-xl transition-all duration-300 shadow-sm"
            >
              <div className="flex items-center gap-4 md:gap-6">
                {/* Google Play Logo */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl md:rounded-2xl bg-gradient-to-br from-blue-500 via-green-500 to-yellow-500 flex items-center justify-center">
                    <svg className="w-10 h-10 md:w-12 md:h-12 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3,20.5V3.5C3,2.91,3.34,2.39,3.84,2.15L13.69,12L3.84,21.85C3.34,21.6,3,21.09,3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08,20.75,11.5,20.75,12C20.75,12.5,20.53,12.9,20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                    </svg>
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-1 md:mb-2">
                    Google Play
                  </h3>
                  <p className="text-sm md:text-base text-gray-600 dark:text-slate-400 mb-3 md:mb-4">
                    Download from Google Play Store
                  </p>
                  <div className="inline-flex items-center bg-black text-white px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base font-semibold hover:scale-105 hover:shadow-lg transition-all duration-300">
                    <svg className="w-4 h-4 md:w-5 md:h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3,20.5V3.5C3,2.91,3.34,2.39,3.84,2.15L13.69,12L3.84,21.85C3.34,21.6,3,21.09,3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08,20.75,11.5,20.75,12C20.75,12.5,20.53,12.9,20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                    </svg>
                    <span className="whitespace-nowrap">Get it on Google Play</span>
                  </div>
                </div>
              </div>
            </a>

            {/* Apple App Store */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-gray-200 dark:border-slate-700 opacity-60">
              <div className="flex items-center gap-4 md:gap-6">
                {/* Apple Logo */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl md:rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <svg className="w-10 h-10 md:w-12 md:h-12 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05,20.28c-0.98,0.95-2.05,0.8-3.08,0.35c-1.09-0.46-2.09-0.48-3.24,0c-1.44,0.62-2.2,0.44-3.06-0.35 C2.79,15.25,3.51,7.59,9.05,7.31c1.35,0.07,2.29,0.74,3.08,0.8c1.18-0.24,2.31-0.93,3.57-0.84c1.51,0.12,2.65,0.72,3.4,1.8 c-3.12,1.87-2.38,5.98,0.48,7.13c-0.57,1.5-1.31,2.99-2.54,4.09L17.05,20.28z M12.03,7.25c-0.15-2.23,1.66-4.07,3.74-4.25 c0.29,2.58-2.34,4.5-3.74,4.25z"/>
                    </svg>
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-1 md:mb-2">
                    iOS (iPhone & iPad)
                  </h3>
                  <p className="text-sm md:text-base text-gray-600 dark:text-slate-400 mb-3 md:mb-4">
                    In development, will be available soon
                  </p>
                  <button disabled className="bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-slate-500 px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base font-semibold cursor-not-allowed">
                    Coming Soon
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
