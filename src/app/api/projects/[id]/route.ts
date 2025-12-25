import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET - Get single project with stats
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = params.id

    // Get project with invoice stats
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        *,
        invoices:invoices(
          id,
          total_amount,
          tax_amount,
          invoice_type,
          status
        )
      `)
      .eq('id', projectId)
      .single()

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Verify user has access to this organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', project.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Calculate stats
    const invoices = project.invoices || []
    const stats = {
      total_invoices: invoices.length,
      incoming_count: invoices.filter((i: any) => i.invoice_type === 'incoming').length,
      outgoing_count: invoices.filter((i: any) => i.invoice_type === 'outgoing').length,
      total_incoming: invoices
        .filter((i: any) => i.invoice_type === 'incoming')
        .reduce((sum: number, i: any) => sum + (i.total_amount || 0), 0),
      total_outgoing: invoices
        .filter((i: any) => i.invoice_type === 'outgoing')
        .reduce((sum: number, i: any) => sum + (i.total_amount || 0), 0),
      total_tax_incoming: invoices
        .filter((i: any) => i.invoice_type === 'incoming')
        .reduce((sum: number, i: any) => sum + (i.tax_amount || 0), 0),
      total_tax_outgoing: invoices
        .filter((i: any) => i.invoice_type === 'outgoing')
        .reduce((sum: number, i: any) => sum + (i.tax_amount || 0), 0),
    }

    return NextResponse.json({
      project: {
        ...project,
        invoices: undefined, // Don't send full invoice list
        stats,
      },
    })
  } catch (error) {
    console.error('Project GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update a project
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = params.id
    const body = await request.json()
    const { name, code, description, color, is_active, member_ids } = body

    // Get project to verify access
    const { data: existingProject } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .single()

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Verify user has access
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', existingProject.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check for duplicate code if changed
    if (code) {
      const { data: duplicateCode } = await supabase
        .from('projects')
        .select('id')
        .eq('organization_id', existingProject.organization_id)
        .eq('code', code)
        .neq('id', projectId)
        .single()

      if (duplicateCode) {
        return NextResponse.json({ error: 'Project code already exists' }, { status: 400 })
      }
    }

    // Update project
    const { data: project, error } = await supabase
      .from('projects')
      .update({
        name: name?.trim(),
        code: code?.trim() || null,
        description: description?.trim() || null,
        color: color,
        is_active: is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .select()
      .single()

    if (error) {
      console.error('Error updating project:', error)
      return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
    }

    // Update project members if specified
    if (member_ids !== undefined) {
      // First, delete existing members
      await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)

      // Then insert new members if any
      if (member_ids && member_ids.length > 0) {
        const memberInserts = member_ids.map((userId: string) => ({
          project_id: projectId,
          user_id: userId,
        }))

        const { error: membersError } = await supabase
          .from('project_members')
          .insert(memberInserts)

        if (membersError) {
          console.error('Error updating project members:', membersError)
        }
      }
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Project PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = params.id

    // Get project to verify access
    const { data: project } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .single()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Verify user is owner
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', project.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can delete projects' }, { status: 403 })
    }

    // Check if project has invoices
    const { count } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)

    if (count && count > 0) {
      // Instead of deleting, just deactivate
      await supabase
        .from('projects')
        .update({ is_active: false })
        .eq('id', projectId)

      return NextResponse.json({
        success: true,
        message: 'Project deactivated (has invoices)',
        deactivated: true,
      })
    }

    // Delete project
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (error) {
      console.error('Error deleting project:', error)
      return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Project DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
