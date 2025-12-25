'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError('Pogrešan email ili lozinka')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError('Došlo je do greške. Pokušajte ponovo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-lime-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 relative">
            <svg viewBox="0 0 40 40" className="w-12 h-12">
              <circle cx="20" cy="20" r="8" fill="none" stroke="#3ECFB2" strokeWidth="2"/>
              <path d="M20 4 L22 10 L18 10 Z" fill="#3ECFB2"/>
              <path d="M20 36 L22 30 L18 30 Z" fill="#9ACD32"/>
              <path d="M4 20 L10 22 L10 18 Z" fill="#3ECFB2"/>
              <path d="M36 20 L30 22 L30 18 Z" fill="#9ACD32"/>
              <path d="M8.5 8.5 L13 12 L11 14 Z" fill="#3ECFB2"/>
              <path d="M31.5 31.5 L27 28 L29 26 Z" fill="#9ACD32"/>
              <path d="M31.5 8.5 L27 12 L29 14 Z" fill="#9ACD32"/>
              <path d="M8.5 31.5 L13 28 L11 26 Z" fill="#3ECFB2"/>
            </svg>
          </div>
          <span className="text-3xl font-bold text-white tracking-wide">SERVICEX</span>
        </div>

        <Card className="border-navy-600">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl text-white">Dobrodosli nazad</CardTitle>
            <p className="text-navy-400 mt-1">Prijavite se na svoj nalog</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                id="email"
                label="Email"
                type="email"
                placeholder="vas@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                id="password"
                label="Lozinka"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
              <Button type="submit" className="w-full" loading={loading}>
                Prijavi se
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-navy-400 text-sm">
                Nemate nalog?{' '}
                <Link href="/register" className="text-teal-400 hover:text-teal-300 font-medium">
                  Registrujte se
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-navy-500 text-sm mt-6">
          Invoice Manager by SERVICEX
        </p>
      </div>
    </div>
  )
}
