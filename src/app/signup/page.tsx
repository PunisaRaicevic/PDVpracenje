'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Lozinke se ne podudaraju')
      return
    }

    // Validate password strength
    if (password.length < 6) {
      setError('Lozinka mora imati najmanje 6 karaktera')
      return
    }

    setIsLoading(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('Korisnik sa ovim emailom vec postoji')
        } else {
          setError(signUpError.message)
        }
        return
      }

      if (data.user) {
        // Redirect to onboarding to create organization
        router.push('/onboarding')
      }
    } catch (err: any) {
      setError(err.message || 'Doslo je do greske')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <CardTitle className="text-2xl">Kreiraj nalog</CardTitle>
          <p className="text-gray-500 mt-2">Pocni besplatno koristiti Invoice Manager</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Input
              label="Puno ime"
              type="text"
              placeholder="Marko Markovic"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <Input
              label="Email adresa"
              type="email"
              placeholder="vas@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Lozinka"
              type="password"
              placeholder="Najmanje 6 karaktera"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />

            <Input
              label="Potvrdi lozinku"
              type="password"
              placeholder="Ponovite lozinku"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              className="w-full"
              loading={isLoading}
            >
              Kreiraj nalog
            </Button>

            <p className="text-center text-sm text-gray-500">
              Vec imate nalog?{' '}
              <Link href="/login" className="text-primary-600 hover:underline font-medium">
                Prijavite se
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
