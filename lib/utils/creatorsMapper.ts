import { ApiCreator, ComponentCreator } from '../../types/creators'

/**
 * Utility function to truncate strings to specified length
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

/**
 * Maps API creator data to component-expected format
 * Provides fallback values for missing fields to prevent runtime errors
 */
export function mapApiCreatorToComponent(apiCreator: ApiCreator): ComponentCreator {
  return {
    id: apiCreator.id,
    name: truncate(
      apiCreator.name || apiCreator.fullName || apiCreator.nickname || 'Unknown',
      50
    ),
    username: truncate(
      apiCreator.nickname || `user${apiCreator.id.slice(0, 6)}`,
      20
    ),
    description: truncate(
      apiCreator.bio || 'No description available',
      200
    ),
    avatar: apiCreator.avatar,
    backgroundImage: apiCreator.backgroundImage,
    coverImage: apiCreator.backgroundImage || '',
    isVerified: false, // TODO: Add verification status to API
    subscribers: apiCreator.followersCount || 0,
    posts: apiCreator.postsCount || 0,
    tags: [], // TODO: Add tags relationship to API
    monthlyEarnings: '0 SOL', // TODO: Calculate from transactions
    createdAt: apiCreator.createdAt
  }
}

/**
 * Maps array of API creators to component format
 */
export function mapApiCreatorsToComponent(apiCreators: ApiCreator[]): ComponentCreator[] {
  return apiCreators.map(mapApiCreatorToComponent)
} 