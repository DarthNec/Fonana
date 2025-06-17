const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkDogwaterSettings() {
  try {
    console.log('🔍 Поиск пользователя Dogwater...\n')
    
    const dogwater = await prisma.user.findFirst({
      where: { nickname: 'Dogwater' },
      include: {
        tierSettings: true
      }
    })
    
    if (!dogwater) {
      console.log('❌ Пользователь Dogwater не найден')
      console.log('\n📋 Список всех пользователей с флагом isCreator:')
      
      const creators = await prisma.user.findMany({
        where: { isCreator: true },
        select: {
          id: true,
          nickname: true,
          wallet: true,
          isCreator: true
        }
      })
      
      creators.forEach(creator => {
        console.log(`- ${creator.nickname || 'Без ника'} (${creator.id}) - wallet: ${creator.wallet?.slice(0, 10)}...`)
      })
      
      return
    }
    
    console.log('✅ Пользователь найден:')
    console.log(`- ID: ${dogwater.id}`)
    console.log(`- Nickname: ${dogwater.nickname}`)
    console.log(`- Is Creator: ${dogwater.isCreator}`)
    console.log(`- Wallet: ${dogwater.wallet}`)
    
    if (dogwater.tierSettings) {
      console.log('\n📊 Настройки тиров:')
      console.log('\nBasic Tier:')
      console.log(JSON.stringify(dogwater.tierSettings.basicTier, null, 2))
      console.log('\nPremium Tier:')
      console.log(JSON.stringify(dogwater.tierSettings.premiumTier, null, 2))
      console.log('\nVIP Tier:')
      console.log(JSON.stringify(dogwater.tierSettings.vipTier, null, 2))
    } else {
      console.log('\n⚠️  У пользователя нет кастомных настроек тиров')
    }
    
    // Проверим общее количество настроек тиров
    const totalSettings = await prisma.creatorTierSettings.count()
    console.log(`\n📈 Всего кастомных настроек тиров в БД: ${totalSettings}`)
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkDogwaterSettings() 