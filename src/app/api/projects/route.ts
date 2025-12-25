import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// GET - List projects for the organization
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's current organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_organization_id) {
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 })
    }

    // Get projects with invoice counts
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        *,
        invoices:invoices(count)
      `)
      .eq('organization_id', profile.current_organization_id)
      .order('name')

    if (error) {
      console.error('Error fetching projects:', error)
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
    }

    // Try to get project members (table might not exist)
    let projectMembers: any[] = []
    try {
      const { data: members } = await supabase
        .from('project_members')
        .select('project_id, user_id')

      projectMembers = members || []
    } catch (e) {
      // Table doesn't exist yet, ignore
    }

    // Transform to include invoice count and member_ids
    const projectsWithCounts = projects?.map((p) => ({
      ...p,
      invoice_count: p.invoices?.[0]?.count || 0,
      member_ids: projectMembers.filter((pm) => pm.project_id === p.id).map((pm) => pm.user_id),
    }))

    return NextResponse.json({ projects: projectsWithCounts })
  } catch (error) {
    console.error('Projects GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new project
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's current organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_organization_id) {
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 })
    }

    const body = await request.json()
    const { name, code, description, color, member_ids } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    // Check for duplicate code if provided
    if (code) {
      const { data: existing } = await supabase
        .from('projects')
        .select('id')
        .eq('organization_id', profile.current_organization_id)
        .eq('code', code)
        .single()

      if (existing) {
        return NextResponse.json({ error: 'Project code already exists' }, { status: 400 })
      }
    }

    // Create project
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        organization_id: profile.current_organization_id,
        created_by: user.id,
        name: name.trim(),
        code: code?.trim() || null,
        description: description?.trim() || null,
        color: color || '#6366f1',
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating project:', error)
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
    }

    // Add project members if specified
    if (member_ids && member_ids.length > 0) {
      const memberInserts = member_ids.map((userId: string) => ({
        project_id: project.id,
        user_id: userId,
      }))

      const { error: membersError } = await supabase
        .from('project_members')
        .insert(memberInserts)

      if (membersError) {
        console.error('Error adding project members:', membersError)
        // Don't fail the whole request, project was created successfully
      }
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Projects POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
