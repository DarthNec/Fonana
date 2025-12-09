'use client'

import { ArrowLeftIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

export default function ProtectionPolicy() {
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
            <div className="flex items-center justify-center gap-3 mb-4">
              <ShieldCheckIcon className="w-10 h-10 sm:w-12 sm:h-12 text-purple-600 dark:text-purple-400" />
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                Child Safety and Protection Policy
              </h1>
            </div>
            <p className="text-gray-600 dark:text-slate-300 italic">
              Last updated: November 2025
            </p>
          </div>

          {/* Вступление */}
          <div className="mb-8 p-4 sm:p-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl border-l-4 border-purple-600">
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
              At <strong className="text-purple-600 dark:text-purple-400">Void Cat Games</strong>, we are firmly committed to protecting children and preventing any form of child sexual abuse or exploitation (CSAE/CSAM).
              <br />
              <br />
              We do not allow, support, or tolerate any behavior, content, or activity that exploits or endangers children in any way.
            </p>
          </div>

          {/* Контент */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                1. Our Commitment
              </h2>
              <ul className="list-disc pl-6 space-y-3">
                <li className="text-gray-700 dark:text-slate-300">
                  We <strong>strictly prohibit</strong> any form of sexualized content involving minors, including depictions, discussions, or references to child sexual abuse material (CSAM).
                </li>
                <li className="text-gray-700 dark:text-slate-300">
                  We take <strong>immediate action</strong> against any user, partner, or content that violates this policy.
                </li>
                <li className="text-gray-700 dark:text-slate-300">
                  We <strong>report confirmed cases</strong> of child exploitation to the relevant regional and national authorities, in accordance with local laws.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                2. Prevention and Monitoring
              </h2>
              <ul className="list-disc pl-6 space-y-3">
                <li className="text-gray-700 dark:text-slate-300">
                  All user-generated content (UGC) is subject to <strong>content moderation</strong> and <strong>automated scanning</strong> where applicable, to detect and prevent harmful or exploitative material.
                </li>
                <li className="text-gray-700 dark:text-slate-300">
                  We encourage all users to <strong>report</strong> any suspicious activity or content directly through our in-app reporting tools or by email.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                3. Reporting Concerns
              </h2>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
                If you discover or suspect any form of child sexual abuse or exploitation in our applications or related platforms, please contact us immediately:
              </p>
              <div className="p-4 sm:p-6 bg-red-50 dark:bg-red-900/20 rounded-xl border-l-4 border-red-600 mb-4">
                <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
                  📧 <strong>Contact Email:</strong>{' '}
                  <a 
                    href="mailto:voidcatgames88@gmail.com" 
                    className="text-red-600 dark:text-red-400 hover:underline font-medium"
                  >
                    voidcatgames88@gmail.com
                  </a>
                </p>
                <p className="text-gray-700 dark:text-slate-300 leading-relaxed mt-2">
                  We treat all reports with confidentiality and urgency.
                </p>
              </div>
              <div className="p-4 sm:p-6 bg-orange-50 dark:bg-orange-900/20 rounded-xl border-l-4 border-orange-600">
                <p className="text-gray-700 dark:text-slate-300 leading-relaxed font-medium">
                  ⚠️ If you believe a child is in immediate danger, contact your <strong>local law enforcement</strong> or <strong>child protection authority</strong>.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                4. Cooperation with Authorities
              </h2>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
                Void Cat Games fully cooperates with:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li className="text-gray-700 dark:text-slate-300">National and regional child protection agencies</li>
                <li className="text-gray-700 dark:text-slate-300">Law enforcement organizations</li>
                <li className="text-gray-700 dark:text-slate-300">Technology industry initiatives working to eliminate CSAM/CSAE</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                5. Legal Compliance
              </h2>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
                We comply with:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li className="text-gray-700 dark:text-slate-300">
                  The <strong>Google Play Child Safety Standards</strong>
                </li>
                <li className="text-gray-700 dark:text-slate-300">
                  The <strong>U.S. National Center for Missing & Exploited Children (NCMEC)</strong> guidelines
                </li>
                <li className="text-gray-700 dark:text-slate-300">
                  The <strong>EU Directive on combating sexual abuse and sexual exploitation of children (2011/93/EU)</strong>
                </li>
                <li className="text-gray-700 dark:text-slate-300">
                  Applicable <strong>local child protection laws</strong>
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                6. Our Responsibility
              </h2>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
                Our mission is to create safe, creative, and inclusive digital spaces.
              </p>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
                We take child safety seriously and continuously review our policies and technical systems to ensure they meet the highest standards of protection.
              </p>
            </section>
          </div>

          {/* Футер */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-600 text-center">
            <p className="text-sm text-gray-600 dark:text-slate-400">
              © 2025 Void Cat Games. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

