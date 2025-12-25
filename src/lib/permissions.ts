// Role-based permissions for organization members

export type OrgRole = 'owner' | 'employee'

export type Permission =
  | 'manage_organization'    // Update org settings, delete org
  | 'manage_members'         // Invite/remove members, change roles
  | 'view_members'           // View member list
  | 'manage_projects'        // Create/edit/delete projects
  | 'view_projects'          // View projects
  | 'upload_invoices'        // Upload new invoices
  | 'view_invoices'          // View all org invoices
  | 'edit_invoices'          // Edit invoice data
  | 'confirm_invoices'       // Confirm extracted data
  | 'delete_invoices'        // Delete invoices
  | 'generate_reports'       // Generate new reports
  | 'view_reports'           // View/download reports
  | 'send_reports'           // Send reports to accountant

// Permission matrix
const ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  owner: [
    'manage_organization',
    'manage_members',
    'view_members',
    'manage_projects',
    'view_projects',
    'upload_invoices',
    'view_invoices',
    'edit_invoices',
    'confirm_invoices',
    'delete_invoices',
    'generate_reports',
    'view_reports',
    'send_reports',
  ],
  employee: [
    'view_members',
    'manage_projects',
    'view_projects',
    'upload_invoices',
    'view_invoices',
    'edit_invoices',
    'confirm_invoices',
    'generate_reports',
    'view_reports',
    'send_reports',
  ],
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: OrgRole | null, permission: Permission): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

/**
 * Check if a role has all specified permissions
 */
export function hasAllPermissions(role: OrgRole | null, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p))
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: OrgRole | null, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p))
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: OrgRole): Permission[] {
  return ROLE_PERMISSIONS[role] || []
}

/**
 * Check if user can perform action on invoice based on status
 */
export function canEditInvoice(
  role: OrgRole | null,
  invoiceStatus: string
): boolean {
  if (!hasPermission(role, 'edit_invoices')) return false

  // Can only edit invoices that haven't been sent to accountant
  return ['uploading', 'processing', 'processed', 'confirmed'].includes(invoiceStatus)
}

/**
 * Check if user can confirm invoice
 */
export function canConfirmInvoice(
  role: OrgRole | null,
  invoiceStatus: string
): boolean {
  if (!hasPermission(role, 'confirm_invoices')) return false

  // Can only confirm invoices with 'processed' status
  return invoiceStatus === 'processed'
}

/**
 * Check if user can delete invoice
 */
export function canDeleteInvoice(
  role: OrgRole | null,
  invoiceStatus: string
): boolean {
  if (!hasPermission(role, 'delete_invoices')) return false

  // Can only delete invoices that haven't been sent
  return invoiceStatus !== 'sent_to_accountant'
}

// React hook for permissions (client-side)
import { useOrganization } from './organization-context'

export function usePermissions() {
  const { role } = useOrganization()

  return {
    role,
    can: (permission: Permission) => hasPermission(role, permission),
    canAll: (permissions: Permission[]) => hasAllPermissions(role, permissions),
    canAny: (permissions: Permission[]) => hasAnyPermission(role, permissions),
    canEditInvoice: (status: string) => canEditInvoice(role, status),
    canConfirmInvoice: (status: string) => canConfirmInvoice(role, status),
    canDeleteInvoice: (status: string) => canDeleteInvoice(role, status),
    isOwner: role === 'owner',
    isEmployee: role === 'employee',
  }
}
