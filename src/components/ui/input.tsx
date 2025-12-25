'use client'

import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-navy-300 mb-1"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'block w-full px-4 py-2.5 bg-navy-800 border rounded-lg shadow-sm',
            'text-white placeholder-navy-400',
            'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500',
            'disabled:bg-navy-900 disabled:text-navy-500',
            'transition-all duration-200',
            error
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
              : 'border-navy-600 hover:border-navy-500',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
