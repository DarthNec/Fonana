'use client'

import Avatar from '@/components/Avatar'

export default function AvatarsTestPage() {
  const testSeeds = [
    'artcreator',
    'musicvibes',
    'cryptotrader',
    'fitnessqueen',
    'defiexpert',
    'gamerultimate',
    'John Doe',
    'Jane Smith',
    'Crypto King',
    'NFT Artist',
    '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', // wallet address
    'alice@example.com',
    'bob_the_builder',
    'cool-username-123',
    'Web3Developer'
  ]

  const sizes = [32, 48, 64, 96, 128]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-8">
      <div className="container mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Тест новых аватаров DiceBear</h1>
        
        <div className="space-y-12">
          {/* Разные размеры */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Разные размеры</h2>
            <div className="flex items-end gap-4 flex-wrap">
              {sizes.map(size => (
                <div key={size} className="text-center">
                  <Avatar
                    src={null}
                    alt="Test avatar"
                    seed="testuser"
                    size={size}
                    rounded="2xl"
                  />
                  <p className="text-slate-400 text-sm mt-2">{size}px</p>
                </div>
              ))}
            </div>
          </section>

          {/* Разные формы */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Разные формы</h2>
            <div className="flex items-center gap-4 flex-wrap">
              {(['full', 'xl', '2xl', '3xl'] as const).map(rounded => (
                <div key={rounded} className="text-center">
                  <Avatar
                    src={null}
                    alt="Test avatar"
                    seed="shapedemo"
                    size={64}
                    rounded={rounded}
                  />
                  <p className="text-slate-400 text-sm mt-2">{rounded}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Разные seed'ы */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Примеры с разными seed</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {testSeeds.map(seed => (
                <div key={seed} className="bg-slate-800/50 rounded-xl p-4">
                  <div className="flex justify-center mb-3">
                    <Avatar
                      src={null}
                      alt={seed}
                      seed={seed}
                      size={80}
                      rounded="2xl"
                    />
                  </div>
                  <p className="text-white font-medium text-sm text-center truncate">{seed}</p>
                  <p className="text-slate-400 text-xs text-center mt-1">
                    {seed.length > 20 ? 'Wallet' : 'Username'}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* С бордером */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">С декоративным бордером</h2>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl opacity-75"></div>
                <div className="relative bg-slate-900 p-1 rounded-2xl">
                  <Avatar
                    src={null}
                    alt="Border demo"
                    seed="borderuser"
                    size={64}
                    rounded="xl"
                  />
                </div>
              </div>
              
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full opacity-75 animate-pulse"></div>
                <div className="relative bg-slate-900 p-1 rounded-full">
                  <Avatar
                    src={null}
                    alt="Animated border"
                    seed="animateduser"
                    size={64}
                    rounded="full"
                  />
                </div>
              </div>

              <div className="p-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl">
                <Avatar
                  src={null}
                  alt="Simple border"
                  seed="simpleuser"
                  size={64}
                  rounded="xl"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
} 