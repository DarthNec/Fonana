'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useNotifications, useUnreadCount, useNotificationActions, useNotificationsLoading } from '@/lib/store/appStore'
import {
  BellIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  UserPlusIcon,
  BanknotesIcon,
  DocumentIcon,
  CheckIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'

// Функция для форматирования времени
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  
  return date.toLocaleDateString()
}

export default function NotificationsDropdown() {
  const notifications = useNotifications()
  const unreadCount = useUnreadCount()
  const isLoading = useNotificationsLoading()
  const { markAsRead, markAllAsRead, deleteNotification, clearNotifications } = useNotificationActions()
  
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Закрываем dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])
  
  // Получаем иконку для типа уведомления
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'LIKE_POST':
      case 'LIKE_COMMENT':
        return <HeartIcon className="w-5 h-5 text-red-500" />
      case 'COMMENT_POST':
      case 'REPLY_COMMENT':
        return <ChatBubbleLeftIcon className="w-5 h-5 text-blue-500" />
      case 'NEW_SUBSCRIBER':
        return <UserPlusIcon className="w-5 h-5 text-green-500" />
      case 'POST_PURCHASE':
        return <BanknotesIcon className="w-5 h-5 text-yellow-500" />
      case 'NEW_POST_FROM_SUBSCRIPTION':
        return <DocumentIcon className="w-5 h-5 text-purple-500" />
      case 'NEW_MESSAGE':
        return <ChatBubbleLeftIcon className="w-5 h-5 text-purple-500" />
      default:
        return <BellIcon className="w-5 h-5 text-gray-500" />
    }
  }
  
  // Обработка клика на уведомление
  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      await markAsRead(notification.id)
    }
    
    // Переход к соответствующему контенту
    if (notification.metadata?.postId) {
      window.location.href = `/post/${notification.metadata.postId}`
    } else if (notification.metadata?.conversationId) {
      window.location.href = `/messages/${notification.metadata.conversationId}`
    }
  }
  
  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        {unreadCount > 0 ? (
          <BellSolidIcon className="w-6 h-6" />
        ) : (
          <BellIcon className="w-6 h-6" />
        )}
        
        {/* Unread count badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Notifications
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                >
                  Mark all as read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <BellIcon className="w-12 h-12 text-gray-400 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-slate-400">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-slate-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors ${
                      !notification.isRead ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                          {formatTimeAgo(new Date(notification.createdAt))}
                        </p>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex-shrink-0 flex items-center gap-1">
                        {!notification.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              markAsRead(notification.id)
                            }}
                            className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                            title="Mark as read"
                          >
                            <CheckIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteNotification(notification.id)
                          }}
                          className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <button
                onClick={clearNotifications}
                className="text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              >
                Clear read notifications
              </button>
              <Link
                href="/notifications"
                className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                onClick={() => setIsOpen(false)}
              >
                View all
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 