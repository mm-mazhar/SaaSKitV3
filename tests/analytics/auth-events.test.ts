// tests/analytics/auth-events.test.ts
// Drives the real auth callback route for both sign-in flows and asserts the
// signup/OAuth events, plus the guarantee that analytics can never break
// account creation.

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
  // after() has no request scope to defer to in a test, so it runs the work
  // inline -- which is what "after the response" means here.
  after: vi.fn((callback: () => unknown) => {
    void callback()
  }),
  NextResponse: {
    redirect: (url: string | URL) => {
      const response = new Response(null, {
        status: 307,
        headers: { location: String(url) },
      })
      Object.defineProperty(response, 'cookies', {
        value: { set: vi.fn(), delete: vi.fn() },
      })
      return response
    },
  },
}))

const getData = vi.hoisted(() => vi.fn())
vi.mock('@/app/lib/db', () => ({ default: {}, getData }))

const supabaseAuth = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
}))
vi.mock('@/app/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: supabaseAuth })),
}))

const acceptInvite = vi.hoisted(() => vi.fn())
vi.mock('@/lib/services/invitation-service', () => ({
  InvitationService: { acceptInvite },
}))
vi.mock('@/lib/services/organization-service', () => ({
  OrganizationService: { getUserOrganizations: vi.fn(async () => []) },
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => undefined),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}))

import { GET } from '@/app/auth/callback/route'
import { resetPostHogServerClientForTests } from '@/lib/analytics/posthog-server'

const USER = {
  id: 'user-1',
  email: 'maz@example.com',
  user_metadata: { full_name: 'Maz Q' },
  app_metadata: { provider: 'google' },
}

function magicLinkRequest(next = '/dashboard') {
  return new Request(
    `https://example.com/auth/callback?token_hash=abc&type=magiclink&next=${encodeURIComponent(next)}`
  )
}

function oauthRequest(next = '/dashboard') {
  return new Request(
    `https://example.com/auth/callback?code=abc&next=${encodeURIComponent(next)}`
  )
}

function capturesNamed(name: string) {
  return posthog.capture.mock.calls
    .map((call) => call[0] as { event: string; distinctId: string; properties?: Record<string, unknown> })
    .filter((event) => event.event === name)
}

beforeEach(() => {
  vi.clearAllMocks()
  resetPostHogServerClientForTests()

  supabaseAuth.verifyOtp.mockResolvedValue({ error: null })
  supabaseAuth.exchangeCodeForSession.mockResolvedValue({ error: null })
  supabaseAuth.getUser.mockResolvedValue({ data: { user: USER } })
  getData.mockResolvedValue({
    id: USER.id,
    email: USER.email,
    name: 'Maz Q',
    createdAt: new Date(),
  })
})

describe('user_signed_up', () => {
  it('captures exactly once on the first magic-link session', async () => {
    // #given getData reports it inserted the user row
    getData.mockResolvedValue({ id: USER.id, email: USER.email, name: 'Maz Q', createdAt: new Date(), isNewUser: true })

    // #when the magic link is verified
    await GET(magicLinkRequest())

    // #then the signup is recorded against the Supabase user id
    const signups = capturesNamed('user_signed_up')
    expect(signups).toHaveLength(1)
    expect(signups[0]).toMatchObject({
      distinctId: 'user-1',
      properties: { method: 'magic_link', email: USER.email },
    })
  })

  it('stays silent when a returning user signs in again', async () => {
    // Without the isNewUser discriminator this route cannot tell a signup
    // from the hundredth sign-in, and every login would inflate signups.
    getData.mockResolvedValue({ id: USER.id, email: USER.email, name: 'Maz Q', createdAt: new Date() })

    await GET(magicLinkRequest())

    expect(capturesNamed('user_signed_up')).toHaveLength(0)
  })

  it('records the OAuth method when the account is created through Google', async () => {
    getData.mockResolvedValue({ id: USER.id, email: USER.email, name: 'Maz Q', createdAt: new Date(), isNewUser: true })

    await GET(oauthRequest())

    const signups = capturesNamed('user_signed_up')
    expect(signups).toHaveLength(1)
    expect(signups[0].properties).toMatchObject({ method: 'oauth', provider: 'google' })
  })
})

describe('oauth_completed', () => {
  it('captures exactly once on a successful code exchange', async () => {
    await GET(oauthRequest())

    const completed = capturesNamed('oauth_completed')
    expect(completed).toHaveLength(1)
    expect(completed[0]).toMatchObject({
      distinctId: 'user-1',
      properties: { provider: 'google', email: USER.email },
    })
  })

  it('captures for a returning user too, since it measures the auth flow', async () => {
    getData.mockResolvedValue({ id: USER.id, email: USER.email, name: 'Maz Q', createdAt: new Date() })

    await GET(oauthRequest())

    expect(capturesNamed('oauth_completed')).toHaveLength(1)
    expect(capturesNamed('user_signed_up')).toHaveLength(0)
  })

  it('is not captured on the magic-link flow', async () => {
    await GET(magicLinkRequest())

    expect(capturesNamed('oauth_completed')).toHaveLength(0)
  })
})

describe('flushing', () => {
  it('drains before the redirect is returned', async () => {
    getData.mockResolvedValue({ id: USER.id, email: USER.email, name: 'Maz Q', createdAt: new Date(), isNewUser: true })

    const response = await GET(magicLinkRequest())

    expect(response.status).toBe(307)
    expect(posthog.flush).toHaveBeenCalled()
  })
})

describe('analytics failure isolation', () => {
  it('never prevents the account from being created or the invite from being accepted', async () => {
    // The strongest form of the guarantee: capture blows up mid-signup, and
    // the work that follows it in the same request still happens. acceptInvite
    // runs after the capture, so reaching it proves nothing short-circuited.
    getData.mockResolvedValue({ id: USER.id, email: USER.email, name: 'Maz Q', createdAt: new Date(), isNewUser: true })
    posthog.capture.mockImplementation(() => {
      throw new Error('posthog is down')
    })
    acceptInvite.mockResolvedValue({ id: 'member-1', organizationId: 'org-1' })
    const inviteToken = 'a'.repeat(32)

    const response = await GET(magicLinkRequest(`/invite/${inviteToken}`))

    expect(getData).toHaveBeenCalledTimes(1)
    expect(acceptInvite).toHaveBeenCalledWith(inviteToken, USER.id)
    expect(response.status).toBe(307)
  })
})
