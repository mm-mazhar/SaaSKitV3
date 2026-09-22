// tests/analytics/member-joined.test.ts
// Exercises the real InvitationService.acceptInvite, which is the single
// success point all three invite-acceptance entry points funnel through
// (magic-link callback, OAuth callback, and the /invite server action).

import { beforeEach, describe, expect, it, vi } from 'vitest'

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

const tx = vi.hoisted(() => ({
  organizationMember: { count: vi.fn(), create: vi.fn() },
  workspaceMember: { createMany: vi.fn() },
  organizationInvite: { update: vi.fn() },
}))

const prismaMock = vi.hoisted(() => ({
  organizationInvite: { findUnique: vi.fn(), update: vi.fn() },
  organizationMember: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  organization: { findUnique: vi.fn() },
  workspace: { findMany: vi.fn() },
  $transaction: vi.fn(),
}))
vi.mock('@/app/lib/db', () => ({ default: prismaMock }))

import { InvitationService } from '@/lib/services/invitation-service'
import { resetPostHogServerClientForTests } from '@/lib/analytics/posthog-server'

const INVITE = {
  id: 'invite-1',
  token: 'token-1',
  email: 'teammate@example.com',
  organizationId: 'org-1',
  role: 'MEMBER',
  status: 'PENDING',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  workspaceIds: ['ws-1'],
  canManageBilling: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  resetPostHogServerClientForTests()

  prismaMock.organizationInvite.findUnique.mockResolvedValue({ ...INVITE })
  prismaMock.user.findUnique.mockResolvedValue({ email: 'teammate@example.com' })
  prismaMock.organizationMember.findUnique.mockResolvedValue(null)
  prismaMock.$transaction.mockImplementation(async (callback: (t: typeof tx) => unknown) => callback(tx))

  tx.organizationMember.count.mockResolvedValue(1)
  tx.organizationMember.create.mockResolvedValue({
    id: 'member-1',
    organizationId: 'org-1',
    userId: 'user-2',
    role: 'MEMBER',
  })
  tx.workspaceMember.createMany.mockResolvedValue({ count: 1 })
  tx.organizationInvite.update.mockResolvedValue({})
})

describe('member_joined', () => {
  it('captures once, bound to the joining user and the organization', async () => {
    // #given a pending invite matching the signed-in user's email
    // #when they accept it
    const member = await InvitationService.acceptInvite('token-1', 'user-2')

    // #then the membership is still returned to the caller
    expect(member).toMatchObject({ id: 'member-1', organizationId: 'org-1' })
    expect(posthog.capture).toHaveBeenCalledTimes(1)
    expect(posthog.capture).toHaveBeenCalledWith({
      distinctId: 'user-2',
      event: 'member_joined',
      properties: { role: 'MEMBER', workspace_count: 1 },
      groups: { organization: 'org-1' },
    })
  })

  it('drains the event before returning', async () => {
    await InvitationService.acceptInvite('token-1', 'user-2')

    expect(posthog.flush).toHaveBeenCalled()
  })

  it('captures nothing when the user is already a member', async () => {
    // Re-opening an invite link is not a new join; only the transaction below
    // the early return represents someone actually joining.
    prismaMock.organizationMember.findUnique.mockResolvedValue({
      id: 'member-existing',
      organizationId: 'org-1',
    })

    await InvitationService.acceptInvite('token-1', 'user-2')

    expect(posthog.capture).not.toHaveBeenCalled()
  })

  it('captures nothing when the invite has expired', async () => {
    prismaMock.organizationInvite.findUnique.mockResolvedValue({
      ...INVITE,
      expiresAt: new Date(Date.now() - 1000),
    })

    await expect(InvitationService.acceptInvite('token-1', 'user-2')).rejects.toThrow('expired')

    expect(posthog.capture).not.toHaveBeenCalled()
  })

  it('captures nothing when the invite belongs to a different email', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ email: 'someone-else@example.com' })

    await expect(InvitationService.acceptInvite('token-1', 'user-2')).rejects.toThrow()

    expect(posthog.capture).not.toHaveBeenCalled()
  })

  it('still creates the membership when capture throws', async () => {
    posthog.capture.mockImplementation(() => {
      throw new Error('posthog is down')
    })

    const member = await InvitationService.acceptInvite('token-1', 'user-2')

    expect(member).toMatchObject({ id: 'member-1' })
    expect(tx.organizationMember.create).toHaveBeenCalledTimes(1)
  })
})
