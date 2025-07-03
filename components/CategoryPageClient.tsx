'use client'

interface CategoryPageClientProps {
  slug: string
}

export default function CategoryPageClient({ slug }: CategoryPageClientProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Category: {slug}
        </h1>
      </div>
    </div>
  )
}
