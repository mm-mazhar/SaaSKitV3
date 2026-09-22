// lib/orpc/routers/organization.ts

import * as z from 'zod'
import { OrganizationService } from '@/lib/services/organization-service'
import { InvitationService } from '@/lib/services/invitation-service'
import { WorkspaceAccessService } from '@/lib/services/workspace-access-service'
import { protectedProcedure, adminProcedure, ownerProcedure } from '../procedures'
import { ORPCError } from '../server'
import { PLAN_IDS, PRICING_PLANS, ROLES } from '@/lib/constants'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'
import { planTitleFor } from '@/lib/analytics/plan-change'
import { captureServer, flushAnalyticsAfterResponse } from '@/lib/analytics/posthog-server'
import { sendInviteEmail, sendCancellationEmail } from '@/app/lib/email'
import { isDisposableEmail } from '@/lib/email-validator'
import { getFallbackMembership } from '@/lib/auth/guards'
import { cookies } from 'next/headers'

// Rate limiting state (in-memory for simplicity - in production use Redis)
const inviteRateLimits = new Map<string, number>()
const RATE_LIMIT_MS = 60 * 1000 // 1 minute

/**
 * Organization name validation schema
 * Name must be non-empty and 20 characters or fewer
 */
const nameSchema = z.string().min(1, 'Name is required').max(20, 'Name must be 20 characters or fewer')

/**
 * Generate a unique slug from organization name and user ID
 */
function generateSlug(name: string, userId: string): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const userPrefix = userId.substring(0, 8)
  const timestamp = Date.now()
  return `${baseSlug}-${userPrefix}-${timestamp}`
}

export const organizationRouter = {
  /**
   * Create a new organization
   * Validates name (max 20 chars), generates slug, creates org with user as OWNER
   */
  create: protectedProcedure
    .input(z.object({ name: nameSchema }))
    .route({
      method: 'POST',
      path: '/org/create',
      summary: 'Create organization',
      description: 'Creates a new organization with the authenticated user as owner',
    })
    .handler(async ({ input, context }) => {
      const slug = generateSlug(input.name, context.user.id)
      
      try {
        const organization = await OrganizationService.createOrganization(
          context.user.id,
          input.name,
          slug
        )

        // A newly created organization is always on the free plan -- there is
        // no purchase path that creates one -- so seeding the group record
        // here gives every tenant a plan from its first event onward.
        captureServer({
          event: ANALYTICS_EVENTS.ORGANIZATION_CREATED,
          distinctId: context.user.id,
          organizationId: organization.id,
          properties: { is_primary: organization.isPrimary },
          organizationProperties: {
            name: organization.name,
            plan: planTitleFor(PLAN_IDS.free),
          },
        })
        await flushAnalyticsAfterResponse()

        return organization
      } catch (error) {
        if (error instanceof Error && error.message.includes('Limit reached')) {
          throw new ORPCError('PRECONDITION_FAILED', { message: error.message })
        }
        throw error
      }
    }),

  /**
   * Rename default organization prefix (first-run flow)
   * Updates name and replaces only the 'default-organization' slug prefix, preserving the suffix
   * Requires org to be primary and slug to start with 'default-organization-'
   */
  renameDefaultPrefix: adminProcedure
    .input(z.object({
      name: nameSchema,
    }))
    .route({
      method: 'PATCH',
      path: '/org/rename-default-prefix',
      summary: 'Rename default organization prefix',
      description: 'Replaces the default-organization slug prefix and updates display name',
    })
    .handler(async ({ input, context }) => {
      try {
        return await OrganizationService.renameDefaultPrefix(context.orgId, context.user.id, input.name)
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('Forbidden')) {
            throw new ORPCError('FORBIDDEN', { message: 'You do not have permission to rename this organization.' })
          }
          if (error.message.includes('not found')) {
            throw new ORPCError('NOT_FOUND', { message: 'Organization not found' })
          }
          if (error.message.includes('Only primary')) {
            throw new ORPCError('PRECONDITION_FAILED', { message: 'Only primary organization can be renamed in this flow.' })
          }
          if (error.message.includes('default prefix') || error.message.includes('Invalid name')) {
            throw new ORPCError('BAD_REQUEST', { message: error.message })
          }
        }
        throw error
      }
    }),

  /**
   * List all organizations for the current user
   */
  list: protectedProcedure
    .route({
      method: 'GET',
      path: '/org/list',
      summary: 'List organizations',
      description: 'Returns all organizations the authenticated user is a member of',
    })
    .handler(async ({ context }) => {
      return await OrganizationService.getUserOrganizations(context.user.id)
    }),

  /**
   * Get organization by ID
   */
  getById: protectedProcedure
    .input(z.object({ 
      id: z.string(),
      includeSubscription: z.boolean().optional(),
    }))
    .route({
      method: 'GET',
      path: '/org/details',
      summary: 'Get organization',
      description: 'Returns organization details by ID',
    })
    .handler(async ({ input, context }) => {
      const org = await context.db.organization.findUnique({
        where: { id: input.id },
        include: {
          members: {
            include: {
              user: true,
            },
          },
          ...(input.includeSubscription && { subscription: true }),
        },
      })
      
      if (!org || org.deletedAt) {
        throw new ORPCError('NOT_FOUND', { message: 'Organization not found' })
      }
      return org
    }),

  /**
   * Update organization name
   */
  updateName: adminProcedure
    .input(z.object({ name: nameSchema }))
    .route({
      method: 'PATCH',
      path: '/org/name',
      summary: 'Update organization name',
      description: 'Updates the organization name (requires admin role)',
    })
    .handler(async ({ input, context }) => {
      return await OrganizationService.updateOrganization(context.orgId, { name: input.name })
    }),

  /**
   * Update a member's role
   * Prevents modifying OWNER's role and promoting to OWNER
   */
  updateMemberRole: adminProcedure
    .input(z.object({
      targetUserId: z.string(),
      newRole: z.enum([ROLES.ADMIN, ROLES.MEMBER]),
    }))
    .route({
      method: 'PATCH',
      path: '/org/member/role',
      summary: 'Update member role',
      description: 'Updates a member\'s role within the organization',
    })
    .handler(async ({ input, context }) => {
      // Check if target is an OWNER
      const targetMember = await context.db.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: context.orgId,
            userId: input.targetUserId,
          },
        },
      })

      if (!targetMember) {
        throw new ORPCError('NOT_FOUND', { message: 'Member not found' })
      }

      if (targetMember.role === ROLES.OWNER) {
        throw new ORPCError('FORBIDDEN', { 
          message: 'Cannot modify owner role. Use ownership transfer instead.' 
        })
      }

      return await OrganizationService.updateMemberRole(
        context.orgId,
        input.targetUserId,
        input.newRole
      )
    }),

  /**
   * Grant or revoke an ADMIN's billing access (see billingAdminProcedure).
   * OWNER-only -- this is deliberately not on adminProcedure, since the
   * whole point is that an owner (not another admin) decides who else can
   * buy/change subscriptions or open the Stripe billing portal.
   */
  setMemberBillingAccess: ownerProcedure
    .input(z.object({
      targetUserId: z.string(),
      canManageBilling: z.boolean(),
    }))
    .route({
      method: 'PATCH',
      path: '/org/member/billing-access',
      summary: 'Set member billing access',
      description: "Grants or revokes an admin's ability to manage billing",
    })
    .handler(async ({ input, context }) => {
      const targetMember = await context.db.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: context.orgId,
            userId: input.targetUserId,
          },
        },
      })

      if (!targetMember) {
        throw new ORPCError('NOT_FOUND', { message: 'Member not found' })
      }

      if (targetMember.role !== ROLES.ADMIN) {
        throw new ORPCError('FORBIDDEN', {
          message: 'Billing access only applies to admins. Owners always have full access; members never do.',
        })
      }

      return await context.db.organizationMember.update({
        where: {
          organizationId_userId: {
            organizationId: context.orgId,
            userId: input.targetUserId,
          },
        },
        data: { canManageBilling: input.canManageBilling },
      })
    }),

  /**
   * Get a member's workspace access, plus the full set of workspaces the CALLER
   * is allowed to grant (an ADMIN can only grant workspaces they can see themselves).
   */
  getMemberWorkspaceAccess: adminProcedure
    .input(z.object({ targetUserId: z.string() }))
    .route({
      method: 'GET',
      path: '/org/member/workspace-access',
      summary: 'Get member workspace access',
      description: "Returns a member's current workspace access and what the caller may grant",
    })
    .handler(async ({ input, context }) => {
      try {
        return await WorkspaceAccessService.getManageableAccess(
          context.orgId,
          context.user.id,
          input.targetUserId
        )
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('Forbidden')) {
            throw new ORPCError('FORBIDDEN', { message: error.message })
          }
          if (error.message.includes('not found') || error.message.includes('Unauthorized')) {
            throw new ORPCError('NOT_FOUND', { message: error.message })
          }
        }
        throw error
      }
    }),

  /**
   * Replace a member's workspace access with exactly the given set.
   * OWNER can manage ADMIN and MEMBER; ADMIN can only manage MEMBER, and only
   * within workspaces the ADMIN themselves can access.
   */
  setMemberWorkspaceAccess: adminProcedure
    .input(z.object({
      targetUserId: z.string(),
      workspaceIds: z.array(z.string()),
    }))
    .route({
      method: 'PATCH',
      path: '/org/member/workspace-access',
      summary: 'Set member workspace access',
      description: "Replaces a member's workspace access with the given set of workspace IDs",
    })
    .handler(async ({ input, context }) => {
      try {
        await WorkspaceAccessService.setMemberWorkspaceAccess(
          context.orgId,
          context.user.id,
          input.targetUserId,
          input.workspaceIds
        )
        return { success: true }
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('Forbidden') || error.message.includes('only grant')) {
            throw new ORPCError('FORBIDDEN', { message: error.message })
          }
          if (error.message.includes('not found') || error.message.includes('Unauthorized')) {
            throw new ORPCError('NOT_FOUND', { message: error.message })
          }
        }
        throw error
      }
    }),

  /**
   * Invite a member to the organization
   * Enforces rate limit (1 minute) and pending invite limit
   */
  inviteMember: adminProcedure
    .input(z.object({
      email: z.string().email(),
      role: z.enum([ROLES.ADMIN, ROLES.MEMBER]).default(ROLES.MEMBER),
      // Workspaces the invited member will have access to once they accept.
      // Omit to default to every workspace the inviter can themselves access.
      workspaceIds: z.array(z.string()).optional(),
      // Grants the invited ADMIN billing access (see billingAdminProcedure).
      // Only the OWNER may actually set this to true -- an inviting ADMIN
      // (inviteMember itself stays open to any ADMIN) requesting it is
      // silently downgraded to false in the handler below, rather than
      // rejected, so an ordinary invite by an admin still succeeds.
      canManageBilling: z.boolean().optional().default(false),
    }))
    .route({
      method: 'POST',
      path: '/org/invite',
      summary: 'Invite member',
      description: 'Sends an invitation to join the organization',
    })
    .handler(async ({ input, context }) => {
      console.log('🚀 inviteMember handler called with:', input)
      
      // Check for disposable email
      if (isDisposableEmail(input.email)) {
        throw new ORPCError('BAD_REQUEST', { 
          message: 'Disposable emails cannot be invited to organizations. Please use a permanent email address.' 
        })
      }
      
      // Rate limit check
      const rateLimitKey = `${context.orgId}:${context.user.id}`
      const lastInviteTime = inviteRateLimits.get(rateLimitKey)
      
      if (lastInviteTime && Date.now() - lastInviteTime < RATE_LIMIT_MS) {
        const remainingSeconds = Math.ceil((RATE_LIMIT_MS - (Date.now() - lastInviteTime)) / 1000)
        console.log(`⏱️ Rate limit hit for ${context.user.email}: ${remainingSeconds}s remaining`)
        throw new ORPCError('PRECONDITION_FAILED', { 
          message: `Please wait ${remainingSeconds} seconds before sending another invite.` 
        })
      }

      // Only the OWNER can grant billing access -- an ADMIN inviting another
      // ADMIN can't hand out a permission they don't get to decide on.
      const grantCanManageBilling = context.role === ROLES.OWNER ? input.canManageBilling : false

      try {
        console.log('📧 Creating invite...')
        const invite = await InvitationService.createInvite(
          context.user.id,
          context.orgId,
          input.email,
          input.role,
          input.workspaceIds,
          grantCanManageBilling
        )
        console.log('✅ Invite created successfully:', invite.id)

        console.log('🔗 Generating invite link...')
        const inviteLink = InvitationService.getInviteLink(invite.token)
        console.log('✅ Invite link generated:', inviteLink)

        // Send invite email
        console.log('📨 Sending invite email...')
        try {
          await sendInviteEmail({
            to: input.email,
            organizationName: invite.organization?.name,
            inviteLink,
            role: input.role,
            inviterName: invite.inviter?.name || context.user.email,
            expiresAt: invite.expiresAt,
          })
          console.log('✅ Invite email sent successfully')
        } catch (emailError) {
          console.error('⚠️ Failed to send invite email:', emailError)
          // Don't throw - invite was created successfully, email failure shouldn't block
        }

        // Deliberately no invitee email on the event: the invitee has not
        // signed up, and an org-scoped analytics event is the wrong place to
        // create a profile for someone who may never accept. The accepting
        // user is identified properly by member_joined.
        captureServer({
          event: ANALYTICS_EVENTS.MEMBER_INVITED,
          distinctId: context.user.id,
          organizationId: context.orgId,
          properties: {
            role: input.role,
            can_manage_billing: grantCanManageBilling,
            workspace_count: invite.workspaceIds.length,
          },
        })
        await flushAnalyticsAfterResponse()

        // Update rate limit
        inviteRateLimits.set(rateLimitKey, Date.now())

        console.log('🎉 Returning invite response')
        return {
          invite,
          inviteLink,
        }
      } catch (error) {
        console.error('❌ Error in inviteMember handler:', error)
        if (error instanceof Error && error.message.includes('Limit reached')) {
          throw new ORPCError('PRECONDITION_FAILED', { message: error.message })
        }
        if (error instanceof Error && error.message.includes('already a member')) {
          throw new ORPCError('CONFLICT', { message: error.message })
        }
        throw error
      }
    }),

  /**
   * Get all invites for the organization
   */
  getInvites: adminProcedure
    .route({
      method: 'GET',
      path: '/org/invites',
      summary: 'List invites',
      description: 'Returns all pending invitations for the organization',
    })
    .handler(async ({ context }) => {
      return await InvitationService.getOrganizationInvites(context.orgId)
    }),

  /**
   * Revoke an invite
   */
  revokeInvite: adminProcedure
    .input(z.object({ inviteId: z.string() }))
    .route({
      method: 'POST',
      path: '/org/invite/revoke',
      summary: 'Revoke invite',
      description: 'Revokes a pending invitation',
    })
    .handler(async ({ input }) => {
      return await InvitationService.revokeInvite(input.inviteId)
    }),

  /**
   * Delete an invite record permanently
   */
  deleteInvite: adminProcedure
    .input(z.object({ inviteId: z.string() }))
    .route({
      method: 'DELETE',
      path: '/org/invite/delete',
      summary: 'Delete invite',
      description: 'Permanently deletes an invitation record',
    })
    .handler(async ({ input }) => {
      return await InvitationService.deleteInvite(input.inviteId)
    }),

  /**
   * Resend an invite (regenerate token and update expiry)
   */
  resendInvite: adminProcedure
    .input(z.object({ inviteId: z.string() }))
    .route({
      method: 'POST',
      path: '/org/invite/resend',
      summary: 'Resend invite',
      description: 'Resends an invitation with a new token',
    })
    .handler(async ({ input, context }) => {
      const invite = await InvitationService.reinvite(input.inviteId)
      const inviteLink = InvitationService.getInviteLink(invite.token)
      
      // Send invite email
      try {
        await sendInviteEmail({
          to: invite.email,
          organizationName: invite.organization?.name,
          inviteLink,
          role: invite.role,
          inviterName: invite.inviter?.name || context.user.email,
          expiresAt: invite.expiresAt,
        })
        console.log('✅ Resend invite email sent successfully')
      } catch (emailError) {
        console.error('⚠️ Failed to resend invite email:', emailError)
      }
      
      return {
        invite,
        inviteLink,
      }
    }),

  /**
   * Remove a member from the organization
   */
  removeMember: adminProcedure
    .input(z.object({ targetUserId: z.string() }))
    .route({
      method: 'DELETE',
      path: '/org/member/remove',
      summary: 'Remove member',
      description: 'Removes a member from the organization',
    })
    .handler(async ({ input, context }) => {
      try {
        return await OrganizationService.removeMember(context.orgId, input.targetUserId)
      } catch (error) {
        if (error instanceof Error && error.message.includes('last owner')) {
          throw new ORPCError('FORBIDDEN', { message: error.message })
        }
        throw error
      }
    }),

  /**
   * Delete an organization (soft delete)
   * Optionally transfers credits to another organization
   * Cancels Stripe subscription if active
   */
  delete: ownerProcedure
    .input(z.object({ 
      transferToOrgId: z.string().optional() 
    }))
    .route({
      method: 'DELETE',
      path: '/org',
      summary: 'Delete organization',
      description: 'Soft deletes the organization and optionally transfers credits',
    })
    .handler(async ({ input, context }) => {
      const org = await OrganizationService.getOrganizationById(context.orgId)
      
      if (!org) {
        throw new ORPCError('NOT_FOUND', { message: 'Organization not found' })
      }
      if (org.isPrimary) {
        throw new ORPCError('FORBIDDEN', { message: 'Cannot delete the primary organization.' })
      }

      // Handle credit transfer if target org specified
      if (input.transferToOrgId && org.credits > 0) {
        // Verify user owns the target org
        const targetMembership = await context.db.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: input.transferToOrgId,
              userId: context.user.id,
            },
          },
        })

        if (!targetMembership || targetMembership.role !== ROLES.OWNER) {
          throw new ORPCError('FORBIDDEN', { 
            message: 'You must be the owner of the target organization to transfer credits.' 
          })
        }

        // Transfer credits -- and zero the source org's balance in the same
        // transaction. Soft-deleting an org does NOT clear `credits` on its
        // own, so leaving it as-is meant a deleted org still shows its old
        // balance forever. That's a real liability: if support ever restores
        // a soft-deleted org for a user who changed their mind, it would come
        // back with credits it no longer owns -- the same credits the target
        // org already received and may have already spent, effectively
        // duplicating them for free.
        await context.db.$transaction([
          context.db.organization.update({
            where: { id: input.transferToOrgId },
            data: { credits: { increment: org.credits } },
          }),
          context.db.organization.update({
            where: { id: context.orgId },
            data: { credits: 0 },
          }),
        ])
      }

      // Cancel Stripe subscription if exists
      if (org.stripeCustomerId) {
        const subscription = await context.db.subscription.findUnique({
          where: { organizationId: context.orgId },
        })

        if (subscription && subscription.status === 'active') {
          // Import Stripe dynamically to avoid issues if not configured
          try {
            const { stripe } = await import('@/app/lib/stripe')
            await stripe.subscriptions.cancel(subscription.stripeSubscriptionId)

            try {
              const owner = await context.db.organizationMember.findFirst({
                where: { organizationId: context.orgId, role: ROLES.OWNER },
                include: { user: true },
              })

              if (owner?.user?.email) {
                let targetOrgName: string | null = null
                if (input.transferToOrgId && org.credits > 0) {
                  const targetOrg = await context.db.organization.findUnique({
                    where: { id: input.transferToOrgId },
                    select: { name: true },
                  })
                  targetOrgName = targetOrg?.name ?? null
                }

                const planTitle =
                  PRICING_PLANS.find((p) => p.stripePriceId === subscription.planId)?.title ?? null

                await sendCancellationEmail({
                  to: owner.user.email,
                  name: owner.user.name,
                  orgName: org.name,
                  planTitle,
                  final: true,
                  creditsRemaining: org.credits,
                  creditsTransferredTo: targetOrgName || undefined,
                })
              }
            } catch (emailError) {
              console.error('Failed to send final cancellation email:', emailError)
            }
          } catch (error) {
            console.error('Failed to cancel Stripe subscription:', error)
            // Continue with deletion even if Stripe cancellation fails
          }
        }
      }

      // Soft delete the organization
      const deletedOrgId = context.orgId
      const deleted = await OrganizationService.deleteOrganization(deletedOrgId)

      // Re-point the org/workspace cookies if they were pointing at the org we
      // just deleted -- leaving them as-is (or merely clearing them) strands the
      // user: a soft delete doesn't remove the OrganizationMember row, so a
      // stale cookie still passes membership checks and gets silently used for
      // the next mutation, which then fails deep inside whichever service
      // happens to check org.deletedAt (e.g. "Organization not found" creating
      // a workspace); and an *empty* cookie fails just as unhelpfully with
      // "Organization context required" on every subsequent org-scoped action,
      // even though the UI's own display-only fallback logic (dashboard
      // page/layout) makes it look like a different org is already active.
      // Instead, land the user on another organization they still belong to --
      // same as what a fresh dashboard load would resolve to -- so deleting
      // your active org never leaves you in a broken "no org" state.
      try {
        const cookieStore = await cookies()
        if (cookieStore.get('current-org-id')?.value === deletedOrgId) {
          const remaining = await getFallbackMembership(context.user.id)

          if (remaining) {
            cookieStore.set('current-org-id', remaining.organizationId)
          } else {
            cookieStore.delete('current-org-id')
          }
          cookieStore.delete('current-workspace-id')
        }
      } catch (cookieError) {
        console.error('[org.delete] Failed to re-point stale org/workspace cookies:', cookieError)
      }

      return deleted
    }),
}
