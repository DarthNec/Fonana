'use client'

import { useState, useRef, useEffect } from 'react'
import { PrizeWheel, type PrizeWheelRef, type Sector } from '@mertercelik/react-prize-wheel'
import { SparklesIcon, ClockIcon, WalletIcon } from '@heroicons/react/24/outline'
import { useAppStore } from '@/lib/store/appStore'
import { useSafeWalletModal } from '@/lib/hooks/useSafeWalletModal'
import Image from 'next/image'

// Конфигурация призов
const PRIZES: Sector[] = [
  { id: 1, label: '✨ Extra Generation', text: '✨ Extra Generation' },
  // { id: 2, label: '🪙 SOL PRIZE', text: '🪙 SOL PRIZE' }, // ← Временно отключено
  { id: 2, label: '❌ Try next time', text: '❌ Try next time' },
  { id: 3, label: '✨ Extra Generation', text: '✨ Extra Generation' },
  { id: 4, label: '💎 Premium Post', text: '💎 Premium Post' },
  { id: 5, label: '❌ Try next time', text: '❌ Try next time' },
  // { id: 7, label: '🪙 SOL PRIZE', text: '🪙 SOL PRIZE' }, // ← Временно отключено
  { id: 6, label: '💎 Premium Post', text: '💎 Premium Post' },
  { id: 7, label: '✨ Extra Generation', text: '✨ Extra Generation' },
  { id: 8, label: '❌ Try next time', text: '❌ Try next time' },
]

const WHEEL_COLORS: [string, string][] = [
  ['#10b981', '#34d399'], // Green (Extra Generation)
  // ['#f59e0b', '#fbbf24'], // Orange (Solana Prize) ← Временно отключено
  ['#6b7280', '#9ca3af'], // Gray (Try next time)
  ['#14b8a6', '#2dd4bf'], // Teal (Extra Generation)
  ['#ec4899', '#f472b6'], // Pink (Premium Post)
  ['#6b7280', '#9ca3af'], // Gray (Try next time)
  // ['#fb923c', '#fdba74'], // Orange (Solana Prize) ← Временно отключено
  ['#d946ef', '#e879f9'], // Purple (Premium Post)
  ['#059669', '#10b981'], // Green (Extra Generation)
  ['#6b7280', '#9ca3af'], // Gray (Try next time)
]

export default function LotteryPage() {
  const wheelRef = useRef<PrizeWheelRef>(null)
  const [winner, setWinner] = useState<Sector | null>(null)
  const [spinsRemaining, setSpinsRemaining] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [isWaitingForSpin, setIsWaitingForSpin] = useState(false)
  const [isLoading, setIsLoading] = useState(true) // ✅ Loading state для загрузки данных
  const [prizePost, setPrizePost] = useState<any>(null) // ✅ Выигранный пост
  
  // 🔊 Audio refs для звуков колеса
  const spinSoundRef = useRef<HTMLAudioElement | null>(null)
  const winSoundRef = useRef<HTMLAudioElement | null>(null)
  const failSoundRef = useRef<HTMLAudioElement | null>(null)
  
  // Auth check
  const user = useAppStore(state => state.user)
  const { setVisible } = useSafeWalletModal()
  const [isAuthorized, setIsAuthorized] = useState(false)
  
  useEffect(() => {
    // Проверяем, что пользователь авторизован и это НЕ гостевой режим
    const isGuest = localStorage.getItem('fonana_guest_auth') === 'true'
    const isTelegram = localStorage.getItem('fonana_telegram_auth') === 'true'
    const hasWallet = localStorage.getItem('fonana_user_wallet')
    
    // Авторизован = есть кошелек И это не гость И не Telegram
    const authorized = !!user && !!hasWallet && !isGuest && !isTelegram
    setIsAuthorized(authorized)
  }, [user])
  
  // ✅ Загружаем количество доступных вращений с backend
  useEffect(() => {
    const fetchAvailableSpins = async () => {
      const wallet = localStorage.getItem('fonana_user_wallet')
      if (!wallet || !isAuthorized) {
        setIsLoading(false)
        return
      }
      
      try {
        setIsLoading(true)
        const response = await fetch(`/api/wheel?wallet=${wallet}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch spins')
        }
        
        const data = await response.json()
        setSpinsRemaining(data.availableSpins || 0)
      } catch (error) {
        console.error('[Lottery] Failed to fetch available spins:', error)
        setSpinsRemaining(0)
      } finally {
        setIsLoading(false)
      }
    }
    
    if (isAuthorized) {
      fetchAvailableSpins()
    }
  }, [isAuthorized])
  
  // 🔍 DEBUG: Логирование изменений состояния для диагностики popup
  useEffect(() => {
    console.log('[Lottery DEBUG] State changed:')
    console.log('  - winner:', winner?.label || 'null')
    console.log('  - isSpinning:', isSpinning)
    console.log('  - isWaitingForSpin:', isWaitingForSpin)
    console.log('  - Popup visible?', winner && !isSpinning ? 'YES' : 'NO')
  }, [winner, isSpinning, isWaitingForSpin])
  
  // 🔊 Инициализация аудио объектов
  useEffect(() => {
    spinSoundRef.current = new Audio('/Sounds/wheel_fortune.mp3')
    winSoundRef.current = new Audio('/Sounds/wheel_win.mp3')
    failSoundRef.current = new Audio('/Sounds/wheel_fail.mp3')
    
    // Настройка звука вращения (loop)
    if (spinSoundRef.current) {
      spinSoundRef.current.loop = true
      spinSoundRef.current.volume = 0.5
    }
    
    // Громкость для остальных звуков
    if (winSoundRef.current) winSoundRef.current.volume = 0.7
    if (failSoundRef.current) failSoundRef.current.volume = 0.7
    
    return () => {
      // Cleanup
      spinSoundRef.current?.pause()
      winSoundRef.current?.pause()
      failSoundRef.current?.pause()
    }
  }, [])
  
  // Если не авторизован - показываем экран подключения кошелька
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center pb-20 md:pb-0 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-xl p-8 text-center">
            {/* Icon */}
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-full flex items-center justify-center">
              <WalletIcon className="w-10 h-10 text-purple-600 dark:text-purple-400" />
            </div>
            
            {/* Title */}
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              Connect Wallet Required
            </h2>
            
            {/* Description */}
            <p className="text-gray-600 dark:text-slate-400 mb-6 leading-relaxed">
              The Lottery Wheel is only available for users with a connected Solana wallet. Please connect your wallet to participate.
            </p>
            
            {/* Button */}
            <button
              onClick={() => setVisible(true)}
              className="w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl font-bold text-lg transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-3"
            >
              <WalletIcon className="w-6 h-6" />
              Connect Wallet
            </button>
            
            {/* Info */}
            <p className="mt-4 text-xs text-gray-500 dark:text-slate-500">
              Guest and Telegram users cannot access the lottery
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ✅ Полноэкранный loader пока загружаются данные
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 dark:bg-black/80 flex items-center justify-center animate-fadeIn backdrop-blur-sm">
        <div className="text-center">
          {/* Spinning wheel icon */}
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 animate-spin" 
                 style={{ animationDuration: '2s' }}>
            </div>
            <div className="absolute inset-2 rounded-full bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
              <SparklesIcon className="w-8 h-8 text-pink-600 dark:text-pink-400" />
            </div>
          </div>
          
          {/* Loading text */}
          <p className="text-lg font-semibold text-white mb-2">
            Loading Lottery...
          </p>
          <p className="text-sm text-gray-300">
            Fetching your available spins
          </p>
        </div>
      </div>
    )
  }

  const handleSpinClick = async () => {
    if (spinsRemaining <= 0 || isSpinning) return
    
    const wallet = localStorage.getItem('fonana_user_wallet')
    if (!wallet) return
    
    try {
      setWinner(null)
      setIsSpinning(true) // ✅ Показываем FadeIn loader
      setIsWaitingForSpin(true);
      // ✅ Отправляем POST запрос для декремента вращений
      const response = await fetch('/api/wheel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ wallet })
      })
      
      const data = await response.json()
      
      // ❌ Если пришла ошибка (нет доступных вращений)
      if (!response.ok) {
        setIsWaitingForSpin(false);
        console.error('[Lottery] Spin error:', data.error)
        setIsSpinning(false)
        
        // Показываем сообщение об ошибке
        if (data.error === 'No spins available') {
          alert('You have no spins available!')
          setSpinsRemaining(0)
        } else {
          alert('Error: ' + data.error)
        }
        return
      }
      
      // ✅ Успешно - обновляем счётчик и запускаем колесо
      console.log('[Lottery] Spin success! Spins remaining:', data.spinsRemaining)
      setSpinsRemaining(data.spinsRemaining)
      
      // ✅ Скрываем loader ПЕРЕД запуском колеса
      setIsWaitingForSpin(false)
      setIsSpinning(false)  // ✅ CRITICAL FIX: false чтобы показать popup после spin
      
      // 🔊 Запускаем звук вращения
      if (spinSoundRef.current) {
        spinSoundRef.current.currentTime = 0
        spinSoundRef.current.play().catch(err => console.error('[Lottery] Spin sound error:', err))
      }
      
      // Запускаем вращение колеса
      wheelRef.current?.spin()
      
    } catch (error) {
      setIsWaitingForSpin(false);
      console.error('[Lottery] Network error:', error)
      setIsSpinning(false)
      alert('Network error. Please try again.')
    }
  }

  const handleSpinEnd = async (sector: Sector) => {
    console.log('[Lottery] handleSpinEnd called, sector:', sector.label)
    console.log('[Lottery] Current state - isSpinning:', isSpinning, 'winner:', winner)
    
    // 🔊 Останавливаем звук вращения
    if (spinSoundRef.current) {
      spinSoundRef.current.pause()
      spinSoundRef.current.currentTime = 0
    }
    
    // 🔊 Проигрываем звук результата
    const isTryAgain = sector.label.includes('Try next time')
    if (isTryAgain && failSoundRef.current) {
      failSoundRef.current.currentTime = 0
      failSoundRef.current.play().catch(err => console.error('[Lottery] Fail sound error:', err))
    } else if (!isTryAgain && winSoundRef.current) {
      winSoundRef.current.currentTime = 0
      winSoundRef.current.play().catch(err => console.error('[Lottery] Win sound error:', err))
    }
    
    setWinner(sector)
    setPrizePost(null) // Сбрасываем предыдущий пост
    
    console.log('[Lottery] Winner set to:', sector.label)
    
    // ✅ Отправляем запрос на начисление награды
    const wallet = localStorage.getItem('fonana_user_wallet')
    if (!wallet) {
      console.log('[Lottery] No wallet found, exiting')
      return
    }
    
    console.log('[Lottery] Sending reward request with prize:', sector.label)
    
    try {
      const response = await fetch('/api/wheel/reward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          wallet,
          prize: sector.label  // "✨ Extra Generation", "💎 Premium Post", "❌ Try next time"
        })
      })
      setIsSpinning(false);
      const data = await response.json()
      
      console.log('[Lottery] Reward response:', data)
      
      if (response.ok) {
        console.log('[Lottery] Reward granted:', data.reward)
        
        // ✅ Если выиграли Premium Post, сохраняем информацию о посте
        if (data.reward.type && data.reward.type.includes('Premium Post') && data.reward.post) {
          console.log('[Lottery] Premium Post won! Setting prizePost:', data.reward.post)
          setPrizePost(data.reward.post)
          
          // ✅ Обновляем localStorage с покупками (как в FeedPageClient)
          if (user?.id) {
            try {
              const purchasesResponse = await fetch(`/api/posts/purchases?userId=${user.id}`)
              if (purchasesResponse.ok) {
                const purchasesData = await purchasesResponse.json()
                const purchases = purchasesData.purchases || []
                console.log('[Lottery] Updated user purchases:', purchases.length)
                localStorage.setItem('user_purchases', JSON.stringify(purchases))
              }
            } catch (error) {
              console.error('[Lottery] Failed to update purchases cache:', error)
            }
          }
        } else {
          console.log('[Lottery] Non-premium reward or no post data. Type:', data.reward?.type, 'Has post:', !!data.reward?.post)
        }
      } else {
        console.error('[Lottery] Reward error:', data.error)
      }
    } catch (error) {
      console.error('[Lottery] Failed to grant reward:', error)
    }
    
    console.log('[Lottery] handleSpinEnd complete. Winner should be visible now.')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20 md:pb-0">
      {/* ✅ FadeIn Loader во время ожидания ответа от сервера */}
      {isWaitingForSpin && (
        <div className="fixed inset-0 z-40 bg-black/70 dark:bg-black/80 flex items-center justify-center animate-fadeIn backdrop-blur-sm pointer-events-none">
          <div className="text-center">
            {/* Spinning wheel icon */}
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 animate-spin" 
                   style={{ animationDuration: '1.5s' }}>
              </div>
              <div className="absolute inset-2 rounded-full bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
                <SparklesIcon className="w-8 h-8 text-pink-600 dark:text-pink-400" />
              </div>
            </div>
            
            {/* Loading text */}
            <p className="text-lg font-semibold text-white mb-2">
              Spinning...
            </p>
            <p className="text-sm text-gray-300">
              Good luck!
            </p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <SparklesIcon className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-pink-600 dark:text-pink-400" />
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Lottery Wheel
            </h1>
            <SparklesIcon className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-pink-600 dark:text-pink-400" />
          </div>
          <p className="text-gray-600 dark:text-slate-400 text-base sm:text-lg px-4">
            Spin the wheel and win amazing prizes!
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-4 sm:gap-8 mb-6 sm:mb-8 px-4">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 sm:px-6 py-2 sm:py-3 rounded-full border border-gray-200 dark:border-slate-700 shadow-sm">
            <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600 dark:text-pink-400" />
            <span className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
              Available Spins: <span className="text-pink-600 dark:text-pink-400">{spinsRemaining}</span>
            </span>
          </div>
        </div>

        {/* Wheel Container */}
        <div className="relative w-full max-w-2xl mx-auto mb-8 flex justify-center px-4">
          {/* Responsive container - адаптивный размер колеса */}
          <div 
            className="relative w-full max-w-[320px] sm:max-w-[400px] md:max-w-[500px]"
            style={{ 
              aspectRatio: '1 / 1',
            }}
          >
            <PrizeWheel
              ref={wheelRef}
              sectors={PRIZES}
              onSpinEnd={handleSpinEnd}
              onSpinStart={() => setIsSpinning(true)}
              duration={10}
              minSpins={5}
              maxSpins={7}
              wheelColors={['#ec4899', '#f472b6']}
              frameColor="#ec4899"
              middleColor="#d946ef"
              middleDotColor="#ffffff"
              winIndicatorColor="#f472b6"
              winIndicatorDotColor="#ffffff"
              sticksColor="#ffffff"
              borderColor="#ec4899"
              borderWidth={8}
              textColor="#ffffff"
              textFontSize={14}
            />

            {/* Custom Spin Button Overlay - показываем только когда НЕ крутится */}
            {(!isSpinning && spinsRemaining > 0) && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <button
                  onClick={handleSpinClick}
                  disabled={spinsRemaining <= 0}
                  className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-2xl font-bold text-base sm:text-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all duration-200 pointer-events-auto"
                  style={{
                    boxShadow: '0 0 30px rgba(236, 72, 153, 0.5)',
                  }}
                >
                  {spinsRemaining <= 0 ? (
                    <span className="text-xs sm:text-sm">No Spins</span>
                  ) : (
                    <span className="text-base sm:text-lg font-bold">SPIN</span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Result Modal Popup */}
        {winner && !isSpinning && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fadeIn"
            onClick={() => setWinner(null)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
            
            {/* Modal Content */}
            <div 
              className="relative max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-700/50 animate-scaleIn overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setWinner(null)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-all z-10"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Content */}
              <div className="p-6 sm:p-8 text-center max-h-[80vh] overflow-y-auto">
                {/* Icon */}
                <div className="mb-4 flex justify-center">
                  {winner.label.includes('PRIZE') ? (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 relative bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-full p-5 backdrop-blur-sm">
                      <svg viewBox="0 0 397.7 311.7" className="w-full h-full">
                        <linearGradient id="a" x1="360.88" x2="141.21" y1="351.46" y2="-69.29" gradientUnits="userSpaceOnUse">
                          <stop offset="0" stopColor="#00FFA3"/>
                          <stop offset="1" stopColor="#DC1FFF"/>
                        </linearGradient>
                        <linearGradient id="b" x1="264.83" x2="45.16" y1="401.6" y2="-19.15" gradientUnits="userSpaceOnUse">
                          <stop offset="0" stopColor="#00FFA3"/>
                          <stop offset="1" stopColor="#DC1FFF"/>
                        </linearGradient>
                        <linearGradient id="c" x1="161.48" x2="-58.19" y1="449.55" y2="28.81" gradientUnits="userSpaceOnUse">
                          <stop offset="0" stopColor="#00FFA3"/>
                          <stop offset="1" stopColor="#DC1FFF"/>
                        </linearGradient>
                        <path fill="url(#a)" d="m64.61 231.39c3.54-5.66 9.98-9.13 16.85-9.13h314c8.21 0 12.32 9.94 6.52 15.76l-33.69 33.85c-3.54 5.66-9.98 9.13-16.85 9.13h-314c-8.21 0-12.32-9.94-6.52-15.76z"/>
                        <path fill="url(#b)" d="m64.61 33.85c3.61-5.66 10.04-9.13 16.91-9.13h314c8.21 0 12.32 9.94 6.52 15.76l-33.69 33.85c-3.54 5.66-9.98 9.13-16.85 9.13h-314c-8.21 0-12.32-9.94-6.52-15.76z"/>
                        <path fill="url(#c)" d="m333.09 131.06c-3.54-5.66-9.98-9.13-16.85-9.13h-314c-8.21 0-12.32 9.94-6.52 15.76l33.69 33.85c3.54 5.66 9.98 9.13 16.85 9.13h314c8.21 0 12.32-9.94 6.52-15.76z"/>
                      </svg>
                    </div>
                  ) : (
                    <div className="text-7xl sm:text-8xl">
                      {winner.label.includes('Extra Generation') ? '✨' : 
                       winner.label.includes('Post') ? '🎁' : '😔'}
                    </div>
                  )}
                </div>
                
                {/* Title */}
                <h3 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  {winner.label.includes('Try next time') ? 'Better Luck Next Time!' : 'Congratulations!'}
                </h3>
                
                {/* Subtitle */}
                <p className="text-base sm:text-lg mb-4 text-gray-600 dark:text-slate-400">
                  {winner.label.includes('Try next time') ? 'Keep trying!' : 'You won:'}
                </p>
                
                {/* Prize */}
                <div className="mb-6 p-4 sm:p-5 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200 dark:border-purple-800/50">
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {winner.label}
                  </p>
                  
                  {/* ✅ Описание приза */}
                  <p className="text-sm sm:text-base text-gray-600 dark:text-slate-400 leading-relaxed mb-4">
                    {winner.label.includes('Extra Generation') && (
                      <>You received <span className="font-semibold text-purple-600 dark:text-purple-400">1 additional Sora 2 generation</span>! Create amazing AI videos with cutting-edge technology.</>
                    )}
                    {winner.label.includes('Premium Post') && prizePost && (
                      <>You unlocked access to a premium post! Check your Purchases to view it.</>
                    )}
                    {winner.label.includes('Premium Post') && !prizePost && (
                      <>You unlocked a <span className="font-semibold text-pink-600 dark:text-pink-400">Premium Post reward</span>, but no posts are available right now. Check back later!</>
                    )}
                    {winner.label.includes('Try next time') && (
                      <>Don't give up! Every spin is a new chance to win <span className="font-semibold text-gray-700 dark:text-slate-300">amazing prizes</span>. Try again!</>
                    )}
                  </p>
                  
                  {/* ✅ Предпросмотр выигранного поста (компактный preview) */}
                  {winner.label.includes('Premium Post') && prizePost && prizePost.mediaUrl && (
                    <div className="mt-4 rounded-xl overflow-hidden border-2 border-pink-300 dark:border-pink-600 shadow-lg max-h-64">
                      {prizePost.type === 'image' && (
                        <div className="relative w-full h-48 sm:h-56">
                          <Image
                            src={prizePost.mediaUrl}
                            alt="Prize post"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      )}
                      {prizePost.type === 'video' && (
                        <video
                          src={prizePost.mediaUrl}
                          className="w-full h-48 sm:h-56 object-cover"
                          controls={false}
                          autoPlay={false}
                          muted
                          playsInline
                        />
                      )}
                    </div>
                  )}
                </div>
                
                {/* Button */}
                <button
                  onClick={() => setWinner(null)}
                  className="w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl font-bold text-lg transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                >
                  {winner.label.includes('Try next time') ? 'Try Again' : 'Awesome!'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No spins message */}
        {spinsRemaining <= 0 && !winner && (
          <div className="max-w-md mx-auto p-5 sm:p-6 mx-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-center shadow-sm">
            <p className="text-base sm:text-lg font-semibold mb-2 text-gray-900 dark:text-white">No spins remaining!</p>
            <p className="text-sm text-gray-600 dark:text-slate-400">Come back tomorrow for more spins 🎰</p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.8) translateY(30px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  )
}
