// Списки слов для генерации забавных никнеймов
const adjectives = [
  'happy', 'lazy', 'crazy', 'sleepy', 'bouncy', 'clever', 'swift', 'mighty',
  'shiny', 'fuzzy', 'sneaky', 'bubbly', 'giggly', 'wiggly', 'quirky', 'zesty',
  'groovy', 'jazzy', 'funky', 'cosmic', 'mystic', 'electric', 'neon', 'cyber',
  'pixel', 'retro', 'turbo', 'mega', 'ultra', 'hyper', 'super', 'epic',
  'digital', 'virtual', 'quantum', 'stellar', 'lunar', 'solar', 'galactic', 'atomic'
]

const nouns = [
  'panda', 'sloth', 'koala', 'hamster', 'penguin', 'otter', 'dolphin', 'owl',
  'fox', 'bunny', 'kitten', 'puppy', 'turtle', 'raccoon', 'squirrel', 'hedgehog',
  'llama', 'alpaca', 'unicorn', 'dragon', 'phoenix', 'wizard', 'ninja', 'pirate',
  'robot', 'alien', 'ghost', 'zombie', 'viking', 'samurai', 'knight', 'jedi',
  'trader', 'hodler', 'miner', 'coder', 'artist', 'creator', 'builder', 'explorer'
]

const bios = [
  "Just vibing in the digital realm 🌟",
  "Creating magic one post at a time ✨",
  "Living my best decentralized life 🚀",
  "Spreading good vibes and crypto wisdom 💫",
  "Here for the tech, staying for the community 🌈",
  "Building the future, one block at a time 🔗",
  "Digital artist & blockchain enthusiast 🎨",
  "Turning ideas into reality in Web3 💡",
  "Explorer of virtual worlds and NFT realms 🗺️",
  "Making the internet a more colorful place 🎭",
  "Professional dreamer, amateur reality checker 🌙",
  "Collecting moments, not just tokens 📸",
  "Dancing between pixels and possibilities 💃",
  "Your friendly neighborhood crypto enthusiast 🦸",
  "Making waves in the digital ocean 🌊",
  "Curating the future of digital content 🎪",
  "Blockchain believer, content creator 🎯",
  "Decentralized and loving it 💖",
  "Creating content that matters 🎬",
  "Web3 native, here to inspire 🌠",
  "Riding the wave of digital transformation 🏄",
  "Pixel pusher with a purpose 🎮",
  "Connecting souls through content 🌺",
  "Digital nomad in the metaverse 🏝️",
  "Turning coffee into code and content ☕",
  "Embracing chaos in the crypto cosmos 🌌",
  "Making friends in all the right blockchains 🤝",
  "Professional overthinker, casual creator 🤔",
  "Living proof that memes are currency 😂",
  "Building bridges in the digital divide 🌉",
  "Happiness is a warm wallet 💰",
  "Creating my own digital destiny ⚡",
  "Part human, part algorithm, all awesome 🤖",
  "Spreading positivity one token at a time 🌻",
  "Digital archaeologist digging for gems 💎",
  "Making the metaverse a better place 🏗️",
  "Fueled by curiosity and caffeine ⚗️",
  "Breaking the internet, fixing it with love 💔❤️",
  "Living in the future, posting from the past 🕰️",
  "Quantum leaping through digital dimensions 🌀",
  "Making art that makes you think 🧠",
  "Professional procrastinator, accidental genius 💭",
  "Turning dreams into digital reality 🌃",
  "Mining happiness in the content caves ⛏️",
  "Building castles in the cloud ☁️",
  "Digital alchemist transforming ideas to gold 🧪",
  "Living life one satoshi at a time 🪙",
  "Creating content with consciousness 🧘",
  "Disrupting the status quo with love 💗",
  "Making the impossible slightly probable 🎲",
  "Digital wanderer seeking truth and beauty 🦋",
  "Converting thoughts into blockchain poetry 📝",
  "Building tomorrow's memories today 📅",
  "Professional enthusiast of everything 🎉",
  "Making friends with robots and humans alike 🤝",
  "Dancing on the edge of innovation 🕺",
  "Creating content that sparks joy ⚡",
  "Digital storyteller weaving web3 tales 📚",
  "Living in beta, launching soon 🚀",
  "Making mistakes at the speed of light 💫",
  "Building bridges between worlds 🌏",
  "Content creator by day, meme lord by night 🌓",
  "Turning glitches into features since forever 🐛",
  "Making the virtual feel visceral 🎭",
  "Professional amateur at everything 🎨",
  "Living life in creative mode 🎮",
  "Building the future with vintage tools 🔧",
  "Making waves without making noise 🌊",
  "Digital philosopher asking the big questions 💭",
  "Creating content that creates creators 🔄",
  "Living proof that persistence pays 💪",
  "Making magic happen, mostly by accident ✨",
  "Building empires from ethernet 🏰",
  "Professional overthinker, recreational genius 🧩",
  "Making the metaverse more meta 🌐",
  "Living life at the intersection of art and code 🎨",
  "Creating content that counts 🔢",
  "Digital maverick breaking all the rules 🏴‍☠️",
  "Making friends in high and low places 🎢",
  "Building the future one pixel at a time 🖼️",
  "Living in the moment, posting for eternity ⏳",
  "Making complexity simple since day one 🎯",
  "Digital detective solving content mysteries 🔍",
  "Creating waves in the digital pond 💧",
  "Professional dreamer with practical results 💼",
  "Making the impossible inevitable 🌟",
  "Building bridges between imagination and reality 🌈",
  "Living life like it's always golden hour 🌅",
  "Making content that makes a difference 🦾",
  "Digital architect designing tomorrow 📐",
  "Creating my own adventure every day 🗺️",
  "Professional optimist in a pessimistic world 😊",
  "Making magic from mundane moments ✨",
  "Building communities one connection at a time 🏘️",
  "Living life unfiltered and unafraid 📸",
  "Making the digital world more human 👥",
  "Creating content from the heart 💝",
  "Digital gardener growing ideas 🌱",
  "Professional rebel with a cause 🚩",
  "Making memories in the metaverse 💾",
  "Building the bridge to Web3 and beyond 🚀"
]

// Функция генерации случайного никнейма
export function generateRandomNickname(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const number = Math.floor(Math.random() * 10000)
  
  return `${adj}${noun}${number}`
}

// Функция генерации случайного био
export function generateRandomBio(): string {
  return bios[Math.floor(Math.random() * bios.length)]
}

// Функция генерации полного имени на основе никнейма
export function generateFullNameFromNickname(nickname: string): string {
  // Убираем числа из конца
  const nameWithoutNumbers = nickname.replace(/\d+$/, '')
  
  // Добавляем пробелы перед заглавными буквами
  const withSpaces = nameWithoutNumbers.replace(/([A-Z])/g, ' $1').trim()
  
  // Делаем первую букву заглавной
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1)
} 