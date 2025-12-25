'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useOrganization } from '@/lib/organization-context'
import { Bell, FileText, CheckCircle, AlertCircle, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { sr } from 'date-fns/locale'

interface Notification {
  id: string
  type: string
  title: string
  message: string | null
  invoice_id: string | null
  read_at: string | null
  created_at: string
}

export function NotificationBell() {
  const router = useRouter()
  const supabase = createClient()
  const { currentOrganization } = useOrganization()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read_at).length

  // Load notifications
  const loadNotifications = async () => {
    if (!currentOrganization?.id) return

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (data) {
        setNotifications(data)
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
    setLoading(false)
  }

  // Subscribe to new notifications
  useEffect(() => {
    loadNotifications()

    // Realtime subscription
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentOrganization?.id, supabase])

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        )
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null)

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      )
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    setIsOpen(false)

    if (notification.invoice_id) {
      router.push(`/dashboard/invoices/${notification.invoice_id}`)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'invoice_processed':
        return <CheckCircle size={16} className="text-lime-400" />
      case 'invoice_error':
        return <AlertCircle size={16} className="text-red-400" />
      default:
        return <FileText size={16} className="text-teal-400" />
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-navy-700 rounded-lg transition-colors"
      >
        <Bell size={20} className="text-navy-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gradient-to-r from-teal-500 to-lime-500 text-navy-900 text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-navy-800 rounded-xl shadow-xl border border-navy-600 z-20 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-navy-700">
              <h3 className="font-semibold text-white">Obavjestenja</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-teal-400 hover:text-teal-300 font-medium"
                  >
                    Oznaci sve kao procitano
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-navy-700 rounded-lg transition-colors"
                >
                  <X size={16} className="text-navy-400" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-500 mx-auto" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="mx-auto h-10 w-10 text-navy-600" />
                  <p className="mt-2 text-sm text-navy-400">
                    Nemate obavjestenja
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-navy-700">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full px-4 py-3 text-left hover:bg-navy-700 transition-colors ${
                        !notification.read_at ? 'bg-teal-500/10' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`text-sm ${
                                !notification.read_at
                                  ? 'font-semibold text-white'
                                  : 'font-medium text-navy-300'
                              }`}
                            >
                              {notification.title}
                            </p>
                            {!notification.read_at && (
                              <span className="flex-shrink-0 w-2 h-2 mt-1.5 bg-teal-500 rounded-full" />
                            )}
                          </div>
                          {notification.message && (
                            <p className="text-sm text-navy-400 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                          )}
                          <p className="text-xs text-navy-500 mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: sr,
                            })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-navy-700 bg-navy-700/50">
                <button
                  onClick={() => {
                    setIsOpen(false)
                    router.push('/dashboard/notifications')
                  }}
                  className="w-full text-center text-sm text-teal-400 hover:text-teal-300 font-medium"
                >
                  Pogledaj sva obavjestenja
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
