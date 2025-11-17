import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { query } from '@/lib/database'

export async function POST(req: Request) {
  // Get webhook secret from environment
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET is not set')
    return new Response('Webhook secret not configured', { status: 500 })
  }

  // Get headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create Svix instance with secret
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify webhook
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  // Handle the webhook
  const eventType = evt.type

  try {
    switch (eventType) {
      case 'user.created': {
        const { id, email_addresses, first_name, last_name, created_at, public_metadata } = evt.data

        // Get primary email
        const primaryEmail = email_addresses.find((e) => e.id === evt.data.primary_email_address_id)
        if (!primaryEmail) {
          console.error('No primary email found for user')
          return new Response('No primary email', { status: 400 })
        }

        const email = primaryEmail.email_address
        const name = `${first_name || ''} ${last_name || ''}`.trim() || email

        // Get platform role from metadata (defaults to 'user' if not set)
        const platformRole = (public_metadata as any)?.platform_role || 'user'

        // Get signup source from Clerk metadata (defaults to 'zashboard')
        // Valid sources: 'zing_browser', 'zashboard', 'ogents_builder'
        const signupSource = (public_metadata as any)?.signupSource || 'zashboard'

        // Insert user into database with platform role and signup source
        await query(
          `INSERT INTO users (
            id,
            email,
            name,
            role,
            registration_source,
            created_at,
            updated_at,
            is_active
          )
          VALUES ($1, $2, $3, $4, $5, $6, $6, true)
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            registration_source = EXCLUDED.registration_source,
            updated_at = NOW()`,
          [id, email, name, platformRole, signupSource, new Date(created_at)]
        )

        console.log(`User created: ${email} (${id}) with platform role: ${platformRole}, source: ${signupSource}`)
        break
      }

      case 'user.updated': {
        const { id, email_addresses, first_name, last_name, public_metadata } = evt.data

        // Get primary email
        const primaryEmail = email_addresses.find((e) => e.id === evt.data.primary_email_address_id)
        if (!primaryEmail) {
          console.error('No primary email found for user')
          return new Response('No primary email', { status: 400 })
        }

        const email = primaryEmail.email_address
        const name = `${first_name || ''} ${last_name || ''}`.trim() || email

        // Get platform role from metadata (defaults to 'user' if not set)
        const platformRole = (public_metadata as any)?.platform_role || 'user'

        // Update user in database including platform role
        await query(
          `UPDATE users
           SET email = $1, name = $2, role = $3, updated_at = NOW()
           WHERE id = $4`,
          [email, name, platformRole, id]
        )

        console.log(`User updated: ${email} (${id}) with platform role: ${platformRole}`)
        break
      }

      case 'user.deleted': {
        const { id } = evt.data

        // Soft delete user (mark as inactive instead of deleting)
        await query(
          `UPDATE users
           SET is_active = false, updated_at = NOW()
           WHERE id = $1`,
          [id]
        )

        console.log(`User deleted: ${id}`)
        break
      }

      case 'organization.created': {
        const { id, name, slug, created_at } = evt.data

        // Insert organization into database
        await query(
          `INSERT INTO organizations (
            id,
            name,
            slug,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $4)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            slug = EXCLUDED.slug,
            updated_at = NOW()`,
          [id, name, slug || name.toLowerCase().replace(/\s+/g, '-'), new Date(created_at)]
        )

        console.log(`Organization created: ${name} (${id})`)
        break
      }

      case 'organization.updated': {
        const { id, name, slug } = evt.data

        // Update organization in database
        await query(
          `UPDATE organizations
           SET name = $1, slug = $2, updated_at = NOW()
           WHERE id = $3`,
          [name, slug || name.toLowerCase().replace(/\s+/g, '-'), id]
        )

        console.log(`Organization updated: ${name} (${id})`)
        break
      }

      case 'organization.deleted': {
        const { id } = evt.data

        // Soft delete organization (we keep the data but could mark as inactive)
        // For now, we'll just log it. You may want to add an is_active column.
        console.log(`Organization deleted: ${id}`)
        // Optionally: await query('DELETE FROM organizations WHERE id = $1', [id])
        break
      }

      case 'organizationMembership.created': {
        const { id, organization, public_user_data, role, created_at } = evt.data

        // CORRECTED: Map Clerk organization roles to local roles
        // Platform roles are separate and stored in user.publicMetadata
        const roleMapping: Record<string, string> = {
          'org:super_admin': 'super_admin',  // NEW: Custom org role → org super_admin
          'org:admin': 'admin',               // Org admin → org admin
          'org:member': 'user',               // Org member → org user
          'admin': 'admin'                    // CHANGED: Clerk basic admin → org admin (NOT platform super_admin)
        }
        const mappedRole = roleMapping[role] || 'user'

        // Insert membership into database
        await query(
          `INSERT INTO organization_memberships (
            user_id,
            organization_id,
            role,
            joined_at
          )
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id, organization_id) DO UPDATE SET
            role = EXCLUDED.role,
            last_accessed_at = NOW()`,
          [public_user_data.user_id, organization.id, mappedRole, new Date(created_at)]
        )

        // Also sync to organization_user_roles table for RBAC system
        const roleIdResult = await query(
          'SELECT id FROM organization_roles WHERE organization_id = $1 AND name = $2',
          [organization.id, mappedRole]
        )

        if (roleIdResult.rows.length > 0) {
          await query(
            `INSERT INTO organization_user_roles (user_id, organization_id, role_id, assigned_at)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, organization_id, role_id) DO NOTHING`,
            [public_user_data.user_id, organization.id, roleIdResult.rows[0].id, new Date(created_at)]
          )
        }

        console.log(`Membership created: user ${public_user_data.user_id} joined org ${organization.id} as ${mappedRole} (Clerk role: ${role})`)
        break
      }

      case 'organizationMembership.updated': {
        const { organization, public_user_data, role } = evt.data

        // CORRECTED: Map Clerk organization roles to local roles
        const roleMapping: Record<string, string> = {
          'org:super_admin': 'super_admin',  // NEW: Custom org role → org super_admin
          'org:admin': 'admin',               // Org admin → org admin
          'org:member': 'user',               // Org member → org user
          'admin': 'admin'                    // CHANGED: Clerk basic admin → org admin (NOT platform super_admin)
        }
        const mappedRole = roleMapping[role] || 'user'

        // Update membership role
        await query(
          `UPDATE organization_memberships
           SET role = $1, last_accessed_at = NOW()
           WHERE user_id = $2 AND organization_id = $3`,
          [mappedRole, public_user_data.user_id, organization.id]
        )

        // Also update in organization_user_roles table
        // First, remove old role assignments
        await query(
          'DELETE FROM organization_user_roles WHERE user_id = $1 AND organization_id = $2',
          [public_user_data.user_id, organization.id]
        )

        // Then add new role
        const roleIdResult = await query(
          'SELECT id FROM organization_roles WHERE organization_id = $1 AND name = $2',
          [organization.id, mappedRole]
        )

        if (roleIdResult.rows.length > 0) {
          await query(
            `INSERT INTO organization_user_roles (user_id, organization_id, role_id, assigned_at)
             VALUES ($1, $2, $3, NOW())`,
            [public_user_data.user_id, organization.id, roleIdResult.rows[0].id]
          )
        }

        console.log(`Membership updated: user ${public_user_data.user_id} in org ${organization.id} now has role ${mappedRole} (Clerk role: ${role})`)
        break
      }

      case 'organizationMembership.deleted': {
        const { organization, public_user_data } = evt.data

        // Remove membership
        await query(
          `DELETE FROM organization_memberships
           WHERE user_id = $1 AND organization_id = $2`,
          [public_user_data.user_id, organization.id]
        )

        console.log(`Membership deleted: user ${public_user_data.user_id} removed from org ${organization.id}`)
        break
      }

      default:
        console.log(`Unhandled webhook event type: ${eventType}`)
    }

    return new Response('Webhook processed', { status: 200 })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response('Error processing webhook', { status: 500 })
  }
}
