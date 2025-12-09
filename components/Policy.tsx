'use client'

import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

export default function Policy() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-900 dark:to-slate-800 py-6 sm:py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 sm:p-10">
          {/* Кнопка "Назад" */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Назад
            </button>
          </div>

          {/* Заголовок */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Fonana Privacy Policy
            </h1>
            <p className="text-gray-600 dark:text-slate-300">
              Effective Date: November 7, 2025
            </p>
          </div>

          {/* Контент */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                1. General Information
              </h2>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
                This Privacy Policy explains how Fonana.me ("the platform", "we", "our service") handles user information when you use the Fonana content exchange platform.
              </p>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
                By using Fonana, you agree to the terms of this Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                2. Information We Collect
              </h2>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
                We collect and process only a minimal amount of information necessary to operate the platform.
              </p>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
                When you use Fonana, we may receive:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li className="text-gray-700 dark:text-slate-300">
                  <strong>Your public Phantom wallet address</strong> — used for authentication and in-platform transactions. We do not have access to your private keys, seed phrases, or any other sensitive wallet data.
                </li>
                <li className="text-gray-700 dark:text-slate-300">
                  <strong>Automatically generated profile data</strong>, including:
                  <ul className="list-circle pl-6 mt-2 space-y-1">
                    <li>username (unique identifier)</li>
                    <li>nickname (display name, editable by the user)</li>
                  </ul>
                </li>
              </ul>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
                We do not collect or store personal information such as email, name, or phone number.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                3. How We Use the Information
              </h2>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
                We use collected information solely for:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li className="text-gray-700 dark:text-slate-300">enabling platform functionality and wallet-based login;</li>
                <li className="text-gray-700 dark:text-slate-300">displaying your public profile;</li>
                <li className="text-gray-700 dark:text-slate-300">supporting user interaction and content exchange within the platform.</li>
              </ul>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
                We do not use your data for advertising, analytics unrelated to the platform, or promotional messages.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                4. Transactions and Signatures
              </h2>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
                All transactions on Fonana are signed through the Phantom wallet interface. We do not store or transmit transaction details, except for public transaction hashes available on the blockchain.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                5. Data Storage
              </h2>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
                Profile data (username, nickname, wallet address) is stored on our servers only for display and platform functionality.
              </p>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
                You may request data deletion at any time (see Section 7).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                6. Data Sharing
              </h2>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
                We do not sell, share, or transfer user data to third parties. The only publicly accessible information is your public wallet address and Fonana profile, if it is made public.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                7. User Rights
              </h2>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li className="text-gray-700 dark:text-slate-300">edit your nickname;</li>
                <li className="text-gray-700 dark:text-slate-300">
                  request deletion of your Fonana profile linked to your wallet address by contacting us at{' '}
                  <a href="mailto:support@fonana.me" className="text-purple-600 dark:text-purple-400 hover:underline">
                    support@fonana.me
                  </a>
                  ;
                </li>
                <li className="text-gray-700 dark:text-slate-300">disconnect your wallet from the platform at any time.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                8. Data Security
              </h2>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
                We use standard security measures, including encrypted HTTPS connections. However, you are solely responsible for the security of your wallet and private keys.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                9. Changes to This Policy
              </h2>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
                We may update this Privacy Policy from time to time. The "Effective Date" at the top of this document will always indicate the latest version. Significant changes will be communicated through the platform interface.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                10. Contact
              </h2>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
                If you have any questions about this Privacy Policy or data handling, please contact us:
              </p>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
                📧{' '}
                <a href="mailto:support@fonana.me" className="text-purple-600 dark:text-purple-400 hover:underline font-medium">
                  support@fonana.me
                </a>
              </p>
            </section>
          </div>

          {/* Футер */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-600 text-center">
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Last updated: November 7, 2025
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

