const fs = require('fs');
const path = require('path');

// Base64 encoded simple notification sounds
// These are very basic sine wave beeps that will work as placeholders
const sounds = {
  'notification-single.mp3': {
    // Simple single beep (440Hz for 200ms)
    base64: 'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAKAAAJYAArKysrKysrVVVVVVVVVVV/f39/f39/f6mpqampqamp09PT09PT09P9/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/7UMQAA8AAAf4AAAAgAAA/wAAABExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV',
    description: 'Simple notification beep'
  },
  'notification-trill.mp3': {
    // Multiple ascending beeps (C-E-G chord arpeggio)
    base64: 'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAPAAAMGAAkJCQkJCQkPDw8PDw8PFRUVFRUVFRsbGxsbGxshISEhISEhJycnJycnJy0tLS0tLS0zMzMzMzMzOTk5OTk5OT8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/PwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//tQxAADwAAB/gAAAACAAAPwAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==',
    description: 'Pleasant ascending trill'
  }
};

// Создаем директорию sounds если её нет
const soundsDir = path.join(__dirname, '..', 'public', 'sounds');
if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

console.log('🎵 Generating notification sounds...\n');

// Сохраняем каждый звук
Object.entries(sounds).forEach(([filename, info]) => {
  const filepath = path.join(soundsDir, filename);
  
  try {
    // Декодируем base64 и сохраняем как файл
    const buffer = Buffer.from(info.base64, 'base64');
    fs.writeFileSync(filepath, buffer);
    console.log(`✅ Generated ${filename} - ${info.description}`);
  } catch (error) {
    console.error(`❌ Failed to generate ${filename}:`, error.message);
  }
});

console.log(`
✨ Sound generation complete!

🎵 These are basic placeholder sounds. For better ASMR-style notifications:
   
1. Record custom sounds:
   - Use a good microphone
   - Record soft bells, chimes, or musical notes
   - Keep them under 1 second for single, 2 seconds for trill
   
2. Find free sounds online:
   - freesound.org (Creative Commons)
   - zapsplat.com (free with account)
   - soundbible.com
   
3. Purchase premium sounds:
   - audiojungle.net
   - pond5.com
   - soundsnap.com

4. Generate with AI:
   - Use AI music generators
   - Create custom notification sounds
`); 