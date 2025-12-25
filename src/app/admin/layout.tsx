import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'

async function getProfile(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await getProfile(user.id)

  // Only admins can access this section
  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar isAdmin={true} />
      <div className="flex-1 flex flex-col">
        <Header
          user={{
            id: user.id,
            email: user.email || '',
            fullName: profile?.full_name,
          }}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
