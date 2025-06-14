/**
 * Generate profile link
 * If user has nickname, generate short link /nickname
 * Otherwise use the full creator/id link
 */
export function getProfileLink(creator: { id: string; nickname?: string | null }): string {
  if (creator.nickname) {
    return `/${creator.nickname}`
  }
  return `/creator/${creator.id}`
}

/**
 * Check if string is a valid nickname (alphanumeric, underscore, dash)
 */
export function isValidNickname(nickname: string): boolean {
  const nicknameRegex = /^[a-zA-Z0-9_-]+$/
  return nicknameRegex.test(nickname)
}

/**
 * Check if nickname is reserved (system routes)
 */
export function isReservedNickname(nickname: string): boolean {
  const reserved = [
    'api', 'admin', 'dashboard', 'feed', 'create', 'creators', 
    'profile', 'settings', 'analytics', 'test', 'category',
    'post', 'intimate', 'login', 'logout', 'signup', 'signin'
  ]
  return reserved.includes(nickname.toLowerCase())
}

// Utility function to generate links

export function getCreatorShareUrl(id: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL || 'https://fonana.me'}/creator/${id}`
}

// Generate short profile URL using nickname
export function getUserProfileUrl(user: { id: string; nickname?: string }): string {
  // If user has a nickname, use short URL format
  if (user.nickname) {
    return `/${user.nickname}`
  }
  // Fallback to creator page if no nickname
  return `/creator/${user.id}`
}

// Generate absolute URL for sharing
export function getUserProfileShareUrl(user: { id: string; nickname?: string }): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fonana.me'
  
  if (user.nickname) {
    return `${baseUrl}/${user.nickname}`
  }
  return `${baseUrl}/creator/${user.id}`
} 