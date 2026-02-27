'use client'

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20 md:pb-0">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-3">
            Cookie Notice
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Last updated: February 2026
          </p>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 sm:p-8 space-y-6">
          
          {/* Introduction */}
          <section>
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
              Fonana and its subsidiaries ("<strong>Fonana</strong>," "<strong>we</strong>," "<strong>us</strong>," "<strong>our</strong>") respect your privacy and we are committed to protecting the personal data we process about you. Fonana is a social network and content sharing platform which enables: (i) "<strong>Creators</strong>" to share and monetise their own content (as well as subscribe to, and view, the content of other Creators); and (ii) "<strong>Fans</strong>" to subscribe to, and view, the content of Creators.
            </p>
          </section>

          {/* Cookie Types */}
          <section>
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
              We use the following types of cookies on Fonana:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300">
              <li>
                <strong>Essential Cookies:</strong> This includes, for example, cookies that allow you to access Fonana through your account, to remember your logged in status where you have requested it, to remember your language preference, and to ensure the security of Fonana and protect against fraud.
              </li>
              <li>
                <strong>Non-Essential cookies:</strong> If you give us your consent to do so, we use non-essential cookies to enable analytics and improve your experience.
              </li>
            </ul>
          </section>

          {/* Important Notice */}
          <section className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50 rounded-xl p-4">
            <p className="text-gray-900 dark:text-white font-medium">
              <strong>We currently do not use any cross-site tracking technologies and we do not sell personal data collected about you, or share personal data collected about you for cross-context behavioural advertising.</strong>
            </p>
          </section>

          {/* What are cookies */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              WHAT ARE COOKIES?
            </h2>
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
              "Cookies" are small strings of text or computer code stored locally on your device that allow us and our third-party service providers, to "remember" or "recognise" a particular browser or device and, in some cases, store information about that browser or device.
            </p>
          </section>

          {/* How long */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              HOW LONG ARE COOKIES STORED ON MY DEVICE?
            </h2>
            <div className="space-y-3">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Session Cookies:</h3>
                <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
                  "Session Cookies" are stored for the duration of a browser session. When you close the browser, the cookie is deleted.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Persistent Cookies:</h3>
                <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
                  "Persistent Cookies" are stored for a set amount of time (often between 90 days and 2 years, depending on the application) and are typically not deleted when a browser session is closed.
                </p>
              </div>
            </div>
          </section>

          {/* What cookies we use */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              WHAT COOKIES DO WE USE, AND WHY?
            </h2>
            
            {/* Essential Cookies */}
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Essential Cookies:
              </h3>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
                Some cookies are necessary to allow you to browse Fonana and access certain pages. Essential cookies enable Fonana to work properly.
              </p>
              
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-mono">
                        fonana_jwt_token
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                        To authenticate user ID and maintain session
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-mono">
                        fonana_user_wallet
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                        To remember your connected Solana wallet
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-mono">
                        fonana-app-store
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                        To store application state and user preferences
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-mono">
                        theme
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                        To remember your theme preference (light/dark mode)
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-mono">
                        fonana_telegram_auth
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                        To remember Telegram authentication status
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-mono">
                        fonana_guest_auth
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                        To remember guest authentication status
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-mono">
                        user_subscriptions
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                        To cache your subscription data for better performance
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-4 italic">
                Disabling, clearing, or blocking these cookies on your browser may prevent Fonana, or certain functionalities on Fonana, from working correctly or at all.
              </p>
            </div>

            {/* Non-Essential Cookies */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Non-Essential Cookies:
              </h3>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
                With your consent, we may use non-essential cookies to improve your experience, analyze usage patterns, and enhance our services.
              </p>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-mono">
                        analytics_session
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                        To track user interactions and improve user experience
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-mono">
                        utm_source / utm_campaign
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                        To track marketing campaign effectiveness
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* How to control */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              HOW DO I CONTROL OR MAKE CHOICES ABOUT COOKIES?
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  Accepting or Rejecting Non-Essential Cookies:
                </h3>
                <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
                  We will only place non-essential cookies on your device if you click "Accept All" in the cookie banner when you first access Fonana.
                </p>
              </div>
              
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  Managing Cookies:
                </h3>
                <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
                  Check out your device and/or browser (or browser add-on) settings to disable, clear or block some or all cookies, or provide notifications when you receive a new cookie. Check out the "Help", "Tools", or "Preferences" menus on your browser for more information about how to do this.
                </p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <section className="pt-6 border-t border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              ©2026 Fonana
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
