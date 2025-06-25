'use client'

import { useEffect, useState } from 'react'
import { detectWalletEnvironment } from '@/lib/auth/solana'

export default function BrowserDetectionTest() {
  const [environment, setEnvironment] = useState<any>(null)
  const [userAgent, setUserAgent] = useState('')
  const [windowProperties, setWindowProperties] = useState<any>({})

  useEffect(() => {
    // Получаем userAgent
    const ua = navigator.userAgent
    setUserAgent(ua)

    // Анализируем window объект
    const props = {
      // Основные свойства
      windowSolana: !!(window as any).solana,
      windowPhantom: !!(window as any).phantom,
      windowEthereum: !!(window as any).ethereum,
      windowOpener: window.opener !== null,
      windowParent: window.parent !== window,
      windowTop: window.top !== window,
      
      // Phantom специфичные свойства
      phantomSolana: !!(window as any).phantom?.solana,
      phantomIsPhantom: !!(window as any).phantom?.solana?.isPhantom,
      
      // Другие кошельки
      solflare: !!(window as any).solflare,
      backpack: !!(window as any).backpack,
      
      // Дополнительные проверки
      isStandalone: (window as any).navigator?.standalone || false,
      isInWebApp: window.matchMedia('(display-mode: standalone)').matches,
      
      // Проверка user agent в деталях
      userAgentIncludes: {
        phantom: ua.toLowerCase().includes('phantom'),
        solflare: ua.toLowerCase().includes('solflare'),
        backpack: ua.toLowerCase().includes('backpack'),
        trustwallet: ua.toLowerCase().includes('trustwallet'),
        metamask: ua.toLowerCase().includes('metamask'),
        firefox: ua.toLowerCase().includes('firefox'),
        chrome: ua.toLowerCase().includes('chrome'),
        safari: ua.toLowerCase().includes('safari'),
      }
    }
    setWindowProperties(props)

    // Получаем результат функции
    const env = detectWalletEnvironment()
    setEnvironment(env)
    
    console.log('Browser Detection Debug:', {
      userAgent: ua,
      environment: env,
      windowProperties: props
    })
  }, [])

  const analyzeIssue = () => {
    if (!environment) return null
    
    // Анализируем почему обычный браузер определяется как in-wallet
    const issues = []
    
    if (environment.isInWalletBrowser && !environment.isMobile) {
      // Проблема на десктопе
      if (windowProperties.userAgentIncludes.phantom && windowProperties.windowOpener) {
        issues.push('Обнаружен Phantom в user agent и window.opener !== null. Это может быть popup окно.')
      }
      if (windowProperties.userAgentIncludes.phantom && !environment.isMobile) {
        issues.push('Проблема: проверка "(userAgent.includes(\'phantom\') && !isMobile && window.opener !== null)" срабатывает в обычном браузере!')
      }
    }
    
    return issues
  }

  const issues = analyzeIssue()

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">🔍 Тестирование определения браузера</h1>

      {/* Результат определения */}
      <div className={`mb-8 p-6 rounded-xl ${environment?.isInWalletBrowser ? 'bg-red-100 dark:bg-red-900/20' : 'bg-green-100 dark:bg-green-900/20'}`}>
        <h2 className="text-xl font-semibold mb-4">
          Результат определения: {environment?.isInWalletBrowser ? '❌ In-Wallet Browser' : '✅ Обычный браузер'}
        </h2>
        {environment && (
          <div className="space-y-2">
            <p>isMobile: <span className="font-mono">{environment.isMobile ? 'true' : 'false'}</span></p>
            <p>isPhantom: <span className="font-mono">{environment.isPhantom ? 'true' : 'false'}</span></p>
            <p>isInWalletBrowser: <span className="font-mono font-bold">{environment.isInWalletBrowser ? 'true' : 'false'}</span></p>
          </div>
        )}
      </div>

      {/* Проблемы */}
      {issues && issues.length > 0 && (
        <div className="mb-8 p-6 bg-yellow-100 dark:bg-yellow-900/20 rounded-xl">
          <h2 className="text-xl font-semibold mb-4">⚠️ Обнаруженные проблемы</h2>
          <ul className="list-disc list-inside space-y-2">
            {issues.map((issue, i) => (
              <li key={i} className="text-sm">{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* User Agent */}
      <div className="mb-8 p-6 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <h2 className="text-xl font-semibold mb-4">User Agent</h2>
        <p className="font-mono text-sm break-all">{userAgent}</p>
      </div>

      {/* Window Properties */}
      <div className="mb-8 p-6 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
        <h2 className="text-xl font-semibold mb-4">Window Properties</h2>
        <div className="grid grid-cols-2 gap-4">
          {windowProperties && Object.entries(windowProperties).map(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              return (
                <div key={key} className="col-span-2">
                  <h3 className="font-semibold mb-2">{key}:</h3>
                  <div className="grid grid-cols-3 gap-2 ml-4">
                    {Object.entries(value).map(([subKey, subValue]) => (
                      <div key={subKey} className="text-sm">
                        <span className="font-mono">{subKey}:</span>{' '}
                        <span className={`font-bold ${subValue ? 'text-green-600' : 'text-gray-500'}`}>
                          {String(subValue)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
            return (
              <div key={key} className="text-sm">
                <span className="font-mono">{key}:</span>{' '}
                <span className={`font-bold ${value ? 'text-green-600' : 'text-gray-500'}`}>
                  {String(value)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Текущая логика определения */}
      <div className="mb-8 p-6 bg-purple-100 dark:bg-purple-900/20 rounded-xl">
        <h2 className="text-xl font-semibold mb-4">📝 Текущая логика определения</h2>
        <pre className="text-xs overflow-x-auto bg-black/10 p-4 rounded-lg">
{`const isInWalletBrowser = 
  // Phantom mobile app
  (userAgent.includes('phantom') && isMobile) ||
  // Solflare mobile app
  (userAgent.includes('solflare') && isMobile) ||
  // Backpack mobile app
  (userAgent.includes('backpack') && isMobile) ||
  // Trust Wallet
  userAgent.includes('trustwallet') ||
  // Проверяем специфичные window свойства для embedded browsers
  (isMobile && !!(window as any).ethereum && userAgent.includes('metamask')) ||
  // Phantom desktop popup (имеет особый user agent)
  (userAgent.includes('phantom') && !isMobile && window.opener !== null)`}
        </pre>
      </div>

      {/* Рекомендации */}
      <div className="p-6 bg-green-100 dark:bg-green-900/20 rounded-xl">
        <h2 className="text-xl font-semibold mb-4">💡 Рекомендации по исправлению</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Удалить проверку <code className="bg-black/10 px-1 rounded">window.opener !== null</code> для десктопа</li>
          <li>Проверять user agent более строго (например, точное соответствие для embedded браузеров)</li>
          <li>Добавить белый список известных обычных браузеров</li>
          <li>Использовать более специфичные маркеры для embedded браузеров</li>
        </ol>
      </div>
    </div>
  )
} 