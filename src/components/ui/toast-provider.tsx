'use client'

import { Toaster } from 'react-hot-toast'

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#fff',
          color: '#374151',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        },
        success: {
          iconTheme: {
            primary: '#10B981',
            secondary: '#fff',
          },
          style: {
            border: '1px solid #D1FAE5',
            background: '#ECFDF5',
          },
        },
        error: {
          iconTheme: {
            primary: '#EF4444',
            secondary: '#fff',
          },
          style: {
            border: '1px solid #FEE2E2',
            background: '#FEF2F2',
          },
        },
      }}
    />
  )
}
