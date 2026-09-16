// lib/orpc/context.ts

import { cookies } from 'next/headers'
import { getCachedUser } from '@/app/lib/supabase/server'
import prisma from '@/app/lib/db'
import { getActiveMembership, getFallbackMembership } from '@/lib/auth/guards'
import type { User } from '@supabase/supabase-js'
import type { OrganizationRole } from '@/lib/constants'

/**
 * oRPC Context type containing authenticated user, database client,
 * organization ID, and user role within the organization.
 */
export interface ORPCContext {
  user: User | null
  db: typeof prisma
  orgId: string | null
  role: OrganizationRole | null
  // Owner-granted permission for an ADMIN to manage billing (see
  // OrganizationMember.canManageBilling). Meaningless for OWNER/MEMBER --
  // OWNER always has full billing access regardless of this value, and
  // MEMBER can't reach a billing procedure at all -- so it's always false
  // for both rather than left undefined.
  canManageBilling: boolean
}

/**
 * Dependencies for context creation - allows injection for testing
 */
export interface ContextDependencies {
  getUser: () => Promise<{ user: User | null; error: Error | null }>
  getOrgIdCookie: () => Promise<string | null>
  getMembership: (orgId: string, userId: string) => Promise<{ role: string; canManageBilling: boolean } | null>
  // Finds another active organization the user belongs to when the cookie is
  // missing or no longer valid (deleted org, stale/garbage id, etc). Without
  // this, any request without a perfectly-valid current-org-id cookie -- a
  // brand new session, or one written by a Server Component's own defensive
  // fallback that (unlike a Server Action) silently fails to persist -- ends
  // up with a null orgId here even though the page itself resolved a real
  // org to display, and every org-scoped procedure it calls then throws
  // "Organization context required" out from under an otherwise normal page.
  getFallbackMembership: (userId: string) => Promise<{ organizationId: string; role: string; canManageBilling: boolean } | null>
  db: typeof prisma
}

/**
 * Core context creation logic - testable with injected dependencies
 */
export async function createContextWithDeps(deps: ContextDependencies): Promise<ORPCContext> {
  // Initialize default context
  const context: ORPCContext = {
    user: null,
    db: deps.db,
    orgId: null,
    role: null,
    canManageBilling: false,
  }

  // Get authenticated user
  const { user, error } = await deps.getUser()

  if (error || !user) {
    return context
  }

  context.user = user

  // Read current-org-id cookie to determine active organization
  const orgId = await deps.getOrgIdCookie()

  let effectiveOrgId: string | null = null
  let role: string | null = null
  let canManageBilling = false

  if (orgId) {
    // Validate organization membership
    const membership = await deps.getMembership(orgId, user.id)
    if (membership) {
      effectiveOrgId = orgId
      role = membership.role
      canManageBilling = membership.canManageBilling
    }
  }

  if (!effectiveOrgId) {
    // No cookie, or it pointed at an org the user isn't (still) an active
    // member of -- fall back to another organization they belong to rather
    // than leaving them with no org context.
    const fallback = await deps.getFallbackMembership(user.id)
    if (fallback) {
      effectiveOrgId = fallback.organizationId
      role = fallback.role
      canManageBilling = fallback.canManageBilling
    }
  }

  if (!effectiveOrgId || !role) {
    return context
  }

  // User is a verified member - include org context
  context.orgId = effectiveOrgId
  context.role = role as OrganizationRole
  context.canManageBilling = canManageBilling

  return context
}

/**
 * Creates the execution context for all oRPC procedures.
 * Bridges Next.js, Supabase Auth, and tenant resolution.
 * 
 * @param req - Optional Request object (used in route handlers)
 * @returns Promise<ORPCContext> - The context object for procedure execution
 */
 
export async function createContext(_req?: Request): Promise<ORPCContext> {
  const deps: ContextDependencies = {
    // Shares the request-deduplicated getCachedUser() lookup (see
    // app/lib/supabase/server.ts) rather than calling createClient() +
    // getUser() fresh every time createContext() runs. getRPCCaller() builds
    // a brand new context on every call, and a single dashboard page/layout
    // render can call it several times -- each was previously its own
    // network round trip to Supabase Auth, compounding the per-navigation
    // latency on top of the layout/page-level calls fixed the same way.
    getUser: async () => {
      const { data: { user }, error } = await getCachedUser()
      return { user, error }
    },
    getOrgIdCookie: async () => {
      const cookieStore = await cookies()
      const orgIdCookie = cookieStore.get('current-org-id')
      return orgIdCookie?.value ?? null
    },
    getMembership: async (orgId: string, userId: string) => {
      // Delegates to the same active-membership query lib/auth/guards.ts uses,
      // so both entry points agree on what counts as "current" -- in
      // particular, both exclude memberships in soft-deleted organizations
      // (see getActiveMembership's doc comment for why that matters).
      return getActiveMembership(orgId, userId)
    },
    getFallbackMembership: async (userId: string) => {
      return getFallbackMembership(userId)
    },
    db: prisma,
  }

  return createContextWithDeps(deps)
}
