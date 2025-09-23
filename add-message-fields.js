const { PrismaClient } = require('@prisma/client')

async function addMessageFields() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://fonana_user:fonana_pass@64.20.37.222:5432/fonana"
      }
    }
  })

  try {
    console.log('Adding isEdited and isDeleted fields to messages table...')
    
    // Add the new columns
    await prisma.$executeRawUnsafe(`
        ALTER TABLE "Message"
        ADD COLUMN IF NOT EXISTS "isEdited" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;
      `);
    
    console.log('✅ Successfully added isEdited and isDeleted fields to messages table!')
    
    // Verify the changes
    const result = await prisma.$queryRawUnsafe(`
        SELECT column_name, data_type, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'Message'
        AND column_name IN ('isEdited', 'isDeleted');
      `);
    
    console.log('📋 Verification - New columns:')
    console.log(result)
    
  } catch (error) {
    console.error('❌ Error adding fields:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addMessageFields()

