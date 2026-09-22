// tests/analytics/organization-events.test.ts
// Invokes the real oRPC procedures and the real server action, so the
// assertions cover the code paths the app actually runs rather than a
// re-implementation of them.

import { call } from '@orpc/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ORPCContext } from '@/lib/orpc/context'

const posthog = vi.hoisted(() => {
  process.env.POSTHOG_KEY = 'phc_test_key'
  return {
    capture: vi.fn(),
    groupIdentify: vi.fn(),
    flush: vi.fn(async () => {}),
    shutdown: vi.fn(async () => {}),
  }
})

vi.mock('posthog-node', () => ({
  PostHog: class {
    constructor() {
      return posthog
    }
  },
}))

vi.mock('next/server', () => ({
  after: vi.fn((callback: () => unknown) => {
    void callback()
  }),
}))

const prismaMock = vi.hoisted(() => ({
  organization: { findUnique: vi.fn(), update: vi.fn() },
  organizationMember: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  organizationInvite: { findUnique: vi.fn(), update: vi.fn() },
  subscription: { findUnique: vi.fn() },
  $transaction: vi.fn(),
}))
vi.mock('@/app/lib/db', () => ({ default: prismaMock }))

const createOrganization = vi.hoisted(() => vi.fn())
vi.mock('@/lib/services/organization-service', () => ({
  OrganizationService: { createOrganization, getOrganizationById: vi.fn(), deleteOrganization: vi.fn(), removeMember: vi.fn(), updateMemberRole: vi.fn(), updateOrganization: vi.fn(), getUserOrganizations: vi.fn(), renameDefaultPrefix: vi.fn() },
}))

const createInvite = vi.hoisted(() => vi.fn())
vi.mock('@/lib/services/invitation-service', () => ({
  InvitationService: {
    createInvite,
    getInviteLink: vi.fn(() => 'https://example.com/invite/token'),
    getOrganizationInvites: vi.fn(),
    revokeInvite: vi.fn(),
    deleteInvite: vi.fn(),
    reinvite: vi.fn(),
  },
}))

vi.mock('@/app/lib/email', () => ({
  sendInviteEmail: vi.fn(async () => {}),
  sendCancellationEmail: vi.fn(async () => {}),
}))

const cookieStore = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}))
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => cookieStore) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT')
  }),
}))

const getCachedUser = vi.hoisted(() => vi.fn())
vi.mock('@/app/lib/supabase/server', () => ({ getCachedUser, createClient: vi.fn() }))

import { switchOrganization } from '@/app/actions/cookie-actions'
import { resetPostHogServerClientForTests } from '@/lib/analytics/posthog-server'
import { organizationRouter } from '@/lib/orpc/routers/organization'

/**
 * The oRPC context is a structural type over the real Prisma client. Test
 * doubles cannot satisfy it nominally, so the shape is asserted through
 * `unknown` -- this is a stand-in for a live dependency, not a silenced error.
 */
function testContext(overrides: Partial<Record<string, unknown>> = {}): ORPCContext {
  return {
    user: { id: 'user-1', email: 'maz@example.com' },
    db: prismaMock,
    orgId: 'org-1',
    role: 'OWNER',
    canManageBilling: true,
    ...overrides,
  } as unknown as ORPCContext
}

function capturedEvent() {
  expect(posthog.capture).toHaveBeenCalledTimes(1)
  return posthog.capture.mock.calls[0][0] as {
    event: string
    distinctId: string
    properties?: Record<string, unknown>
    groups?: Record<string, string>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  resetPostHogServerClientForTests()
  cookieStore.get.mockReturnValue(undefined)
  getCachedUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'maz@example.com' } } })
})

describe('organization_created', () => {
  it('captures once and seeds the group record with the free plan', async () => {
    // #given a user creating their first organization
    createOrganization.mockResolvedValue({ id: 'org-9', name: 'Acme', isPrimary: true })

    // #when the create procedure runs
    const result = await call(organizationRouter.create, { name: 'Acme' }, { context: testContext() })

    // #then the organization is still returned to the caller unchanged
    expect(result).toMatchObject({ id: 'org-9', name: 'Acme' })
    expect(capturedEvent()).toEqual({
      event: 'organization_created',
      distinctId: 'user-1',
      properties: { is_primary: true },
      groups: { organization: 'org-9' },
    })
    // A brand new organization is always on the free plan, so the group
    // starts life with a plan rather than an empty record.
    expect(posthog.groupIdentify).toHaveBeenCalledWith({
      groupType: 'organization',
      groupKey: 'org-9',
      properties: { name: 'Acme', plan: 'Free' },
    })
  })

  it('captures nothing when creation is rejected by a plan limit', async () => {
    createOrganization.mockRejectedValue(new Error('Limit reached: You can only create up to 1 organizations.'))

    await expect(
      call(organizationRouter.create, { name: 'Acme' }, { context: testContext() })
    ).rejects.toThrow()

    expect(posthog.capture).not.toHaveBeenCalled()
  })
})

describe('member_invited', () => {
  it('captures once against the inviting user and the organization', async () => {
    createInvite.mockResolvedValue({
      id: 'invite-1',
      token: 'token',
      workspaceIds: ['ws-1', 'ws-2'],
      expiresAt: new Date(),
      organization: { name: 'Acme' },
      inviter: { name: 'Maz' },
    })

    await call(
      organizationRouter.inviteMember,
      { email: 'teammate@example.com', role: 'MEMBER', canManageBilling: false },
      { context: testContext({ user: { id: 'user-invite', email: 'maz@example.com' } }) }
    )

    expect(capturedEvent()).toEqual({
      event: 'member_invited',
      distinctId: 'user-invite',
      properties: { role: 'MEMBER', can_manage_billing: false, workspace_count: 2 },
      groups: { organization: 'org-1' },
    })
  })

  it('does not put the invitee email on the event', async () => {
    // The invitee has not signed up and may never accept; an org-scoped event
    // is the wrong place to start a profile for them.
    createInvite.mockResolvedValue({
      id: 'invite-2',
      token: 'token',
      workspaceIds: [],
      expiresAt: new Date(),
      organization: { name: 'Acme' },
      inviter: { name: 'Maz' },
    })

    await call(
      organizationRouter.inviteMember,
      { email: 'teammate@example.com', role: 'MEMBER', canManageBilling: false },
      { context: testContext({ user: { id: 'user-invite-2', email: 'maz@example.com' } }) }
    )

    expect(JSON.stringify(capturedEvent())).not.toContain('teammate@example.com')
  })

  it('captures nothing when the invite itself fails', async () => {
    createInvite.mockRejectedValue(new Error('Limit reached: Organization can only have 3 pending invites.'))

    await expect(
      call(
        organizationRouter.inviteMember,
        { email: 'teammate@example.com', role: 'MEMBER', canManageBilling: false },
        { context: testContext({ user: { id: 'user-invite-3', email: 'maz@example.com' } }) }
      )
    ).rejects.toThrow()

    expect(posthog.capture).not.toHaveBeenCalled()
  })
})

describe('organization_switched', () => {
  it('captures before the redirect, with the organization moved away from', async () => {
    // redirect() throws to unwind the request, so anything after it never
    // runs -- the capture has to happen first.
    cookieStore.get.mockReturnValue({ value: 'org-previous' })

    await expect(switchOrganization('org-next')).rejects.toThrow('NEXT_REDIRECT')

    expect(capturedEvent()).toEqual({
      event: 'organization_switched',
      distinctId: 'user-1',
      properties: { from_organization_id: 'org-previous' },
      groups: { organization: 'org-next' },
    })
  })

  it('captures nothing when the user re-selects the organization they are already in', async () => {
    cookieStore.get.mockReturnValue({ value: 'org-same' })

    await expect(switchOrganization('org-same')).rejects.toThrow('NEXT_REDIRECT')

    expect(posthog.capture).not.toHaveBeenCalled()
  })
})
