'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItemProps {
  href?: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  badge?: number
  onClick?: () => void
}

export function NavItem({ href, icon: Icon, label, badge, onClick }: NavItemProps) {
  const pathname = usePathname()
  const isActive = href ? pathname === href || (href !== '/' && pathname.startsWith(href)) : false

  const content = (
    <>
      <Icon className="w-6 h-6 flex-shrink-0" />
      <span className="ml-3 text-base font-medium flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </>
  )

  const className = `flex items-center w-full px-3 py-2.5 rounded-lg transition-all duration-200 ${
    isActive
      ? 'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 text-purple-600 dark:text-purple-400 shadow-sm'
      : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:scale-[1.02]'
  }`

  if (href && href !== '#') {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <button onClick={onClick} className={`${className} text-left`}>
      {content}
    </button>
  )
}

