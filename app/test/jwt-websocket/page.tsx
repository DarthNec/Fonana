'use client'

import { useState, useEffect, useRef } from 'react'
import { useUserContext } from '@/lib/contexts/UserContext'
import { getJWTToken, jwtManager } from '@/lib/utils/jwt'

export default function TestJWTWebSocket() {
  const { user } = useUserContext()
  const [logs, setLogs] = useState<string[]>([])
  const [jwtToken, setJwtToken] = useState<string | null>(null)
  const [wsStatus, setWsStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const wsRef = useRef<WebSocket | null>(null)
  
  const log = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }
  
  const clearLogs = () => {
    setLogs([])
  }
  
  // Получение JWT токена
  const requestJWT = async () => {
    if (!user?.wallet) {
      log('❌ Нет wallet адреса пользователя')
      return
    }
    
    log(`📤 Запрос JWT токена для ${user.wallet}...`)
    
    try {
      const token = await getJWTToken()
      
      if (token) {
        setJwtToken(token)
        log(`✅ JWT токен получен`)
        log(`📋 Токен (первые 20 символов): ${token.substring(0, 20)}...`)
        
        // Проверяем информацию о токене
        const stats = jwtManager.getStats()
        log(`👤 User ID: ${stats.userId}`)
        log(`💰 Wallet: ${stats.wallet}`)
        log(`⏰ Истекает: ${new Date(stats.expiresAt).toLocaleString()}`)
      } else {
        log('❌ Не удалось получить токен')
      }
    } catch (error: any) {
      log(`❌ Ошибка: ${error.message}`)
    }
  }
  
  // Подключение к WebSocket
  const connectWebSocket = async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      log('⚠️  WebSocket уже подключен')
      return
    }
    
    log('🔄 Получение JWT токена...')
    const token = await getJWTToken()
    
    if (!token) {
      log('❌ Нет JWT токена для подключения')
      return
    }
    
    setWsStatus('connecting')
    log('🔌 Подключение к WebSocket...')
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(token)}`
    
    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws
      
      ws.onopen = () => {
        log('✅ WebSocket подключен')
        setWsStatus('connected')
        
        // Подписываемся на уведомления
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: 'notifications'
        }))
      }
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        log(`📨 Получено сообщение: ${data.type}`)
        log(`📋 Данные: ${JSON.stringify(data.data, null, 2)}`)
      }
      
      ws.onerror = (error) => {
        log(`❌ WebSocket ошибка: ${error}`)
        setWsStatus('error')
      }
      
      ws.onclose = () => {
        log('🔌 WebSocket отключен')
        setWsStatus('disconnected')
        wsRef.current = null
      }
      
    } catch (error: any) {
      log(`❌ Ошибка подключения: ${error.message}`)
      setWsStatus('error')
    }
  }
  
  // Отключение от WebSocket
  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
      log('👋 WebSocket отключен вручную')
    }
  }
  
  // Отправка ping
  const sendPing = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }))
      log('🏓 Отправлен ping')
    } else {
      log('❌ WebSocket не подключен')
    }
  }
  
  // Проверка токена
  const verifyToken = async () => {
    if (!jwtToken) {
      log('❌ Нет токена для проверки')
      return
    }
    
    log('🔍 Проверка токена...')
    
    try {
      const response = await fetch('/api/auth/wallet', {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        log('✅ Токен валиден')
        log(`📋 Данные: ${JSON.stringify(data, null, 2)}`)
      } else {
        log(`❌ Токен невалиден: ${response.status}`)
      }
    } catch (error: any) {
      log(`❌ Ошибка проверки: ${error.message}`)
    }
  }
  
  // Выход из системы
  const logout = () => {
    jwtManager.logout()
    setJwtToken(null)
    disconnectWebSocket()
    log('🚪 Выход выполнен')
  }
  
  // Отображение статуса WebSocket
  const getStatusBadge = () => {
    switch (wsStatus) {
      case 'connected':
        return <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">Connected</span>
      case 'connecting':
        return <span className="px-2 py-1 bg-yellow-500 text-white text-xs rounded">Connecting...</span>
      case 'error':
        return <span className="px-2 py-1 bg-red-500 text-white text-xs rounded">Error</span>
      default:
        return <span className="px-2 py-1 bg-gray-500 text-white text-xs rounded">Disconnected</span>
    }
  }
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">JWT & WebSocket Test</h1>
      
      {/* Информация о пользователе */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">User Info</h2>
        {user ? (
          <div className="text-sm space-y-1">
            <p>👤 ID: {user.id}</p>
            <p>💰 Wallet: {user.wallet}</p>
            <p>📝 Nickname: {user.nickname || 'Not set'}</p>
            <p>✅ Authenticated: {jwtManager.isAuthenticated() ? 'Yes' : 'No'}</p>
          </div>
        ) : (
          <p className="text-gray-400">Not logged in</p>
        )}
      </div>
      
      {/* Статус WebSocket */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">WebSocket Status</h2>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <span className="text-sm text-gray-400">Port: 3002</span>
        </div>
      </div>
      
      {/* Кнопки управления */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={requestJWT}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
          disabled={!user}
        >
          🔑 Get JWT Token
        </button>
        
        <button
          onClick={verifyToken}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white"
          disabled={!jwtToken}
        >
          🔍 Verify Token
        </button>
        
        <button
          onClick={connectWebSocket}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
          disabled={wsStatus === 'connected' || !user}
        >
          🔌 Connect WebSocket
        </button>
        
        <button
          onClick={disconnectWebSocket}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded text-white"
          disabled={wsStatus !== 'connected'}
        >
          👋 Disconnect
        </button>
        
        <button
          onClick={sendPing}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded text-white"
          disabled={wsStatus !== 'connected'}
        >
          🏓 Send Ping
        </button>
        
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
        >
          🚪 Logout
        </button>
      </div>
      
      {/* JWT Token Display */}
      {jwtToken && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">JWT Token</h2>
          <div className="break-all text-xs bg-gray-900 p-2 rounded">
            {jwtToken}
          </div>
        </div>
      )}
      
      {/* Логи */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Logs</h2>
          <button
            onClick={clearLogs}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            Clear
          </button>
        </div>
        <div className="bg-gray-900 rounded p-4 h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-400">No logs yet...</p>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => (
                <p key={index} className="text-xs font-mono">{log}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 