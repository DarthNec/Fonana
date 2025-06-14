export function useToast() {
  return {
    toast: ({ title, description, variant }: {
      title: string
      description?: string
      variant?: 'default' | 'destructive'
    }) => {
      // Simple implementation using alert
      // In production, you'd want to use a proper toast library
      const message = description ? `${title}\n\n${description}` : title
      
      if (variant === 'destructive') {
        console.error(message)
      } else {
        console.log(message)
      }
      
      // For now, using alert as a simple solution
      alert(message)
    }
  }
} 