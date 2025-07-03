import ClientShell from '@/components/ClientShell'
import PostPageClient from '@/components/PostPageClient'

interface PostPageProps {
  params: {
    id: string
  }
}

export default function PostPage({ params }: PostPageProps) {
  return (
    <ClientShell>
      <PostPageClient postId={params.id} />
    </ClientShell>
  )
}
