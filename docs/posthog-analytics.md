# PostHog analytics in the SaaS kit

Kit-level plumbing only. No product-specific tracking — that belongs to whatever gets built on top of the kit.

## Where things live

`lib/analytics/events.ts` holds the event catalogue and the `organization` group type. `lib/analytics/posthog-server.ts` owns the shared posthog-node client and the capture/flush helpers. `lib/analytics/identity.ts` holds the identify/reset rules the browser provider applies. `lib/analytics/plan-change.ts` classifies a Stripe price change as an upgrade or downgrade and maps a plan id to its display title. `app/providers.tsx` is the client provider (init, pageviews, identity), mounted in `app/layout.tsx`.

## Events and where they fire

`user_signed_up` and `oauth_completed` fire in `app/auth/callback/route.ts`. `magic_link_sent` fires client-side in `EmailAuthForm` after `signInWithOtp` succeeds. `organization_created` and `member_invited` fire in the oRPC organization router; `member_joined` fires inside `InvitationService.acceptInvite`, which is the one point all three invite-acceptance entry points funnel through. `organization_switched` fires in `switchOrganization` before its redirect. The six billing events fire in the Stripe webhook.

## Decisions worth remembering

Signup detection: `getData` in `app/lib/db.ts` now returns `isNewUser: true` only on the call that actually inserted the row. Without it the auth callback cannot tell a first sign-in from the hundredth, and every login would inflate signups.

`subscription_created` keys off `invoice.paid` with `billing_reason === 'subscription_create'` — the signal the handler already used to gate its confirmation email. Upgrade/downgrade reads the DB subscription's `planId` *before* the update overwrites it, rather than trusting Stripe's `previous_attributes` shape for nested items.

`invoice.payment_failed` is a new webhook branch that does analytics and nothing else. The kit has no dunning logic; when that is added, the capture should move to its success point.

Flush strategy: the posthog-node client is configured `flushAt: 1, flushInterval: 0` because Vercel freezes a function the moment it responds, and the default 20-event/10-second batching would lose events. The Stripe webhook wraps its whole body in `try/finally` and awaits `flushAnalytics()` so every return path — including the early 500 that asks Stripe to retry, and an unexpected throw — drains first. User-facing paths use `flushAnalyticsAfterResponse()`, which defers through Next's `after()` so no analytics round trip sits on the critical path. It is `flush()`, never `shutdown()`: the client is a module singleton a warm instance reuses, and `shutdown()` would close it permanently.

Group analytics is wired from day one because PostHog cannot backfill groups onto historical events.

Analytics never throws into business logic. `captureServer` swallows to a warning, `flushAnalytics` swallows, and both are covered by tests that make capture throw and assert the account is still created, the membership still written, and the webhook still returns 200.

Session replay ships off (`disable_session_recording: true`) — it records form fields and customer data, so turning it on is a per-product privacy decision.

Pageviews are captured manually from a route-change effect rather than via posthog-js's `capture_pageview: 'history_change'`, so the behavior lives in the repo and cannot shift when the SDK revises its defaults.

## Tests

`tests/analytics/` — seven files, both SDKs mocked at module level, nothing touches a network or database. The webhook, auth callback, oRPC procedures and server action are driven for real rather than re-implemented. Stripe price ids are pinned via `vi.hoisted()` before `lib/constants` evaluates, so plan lookups are deterministic regardless of `.env`.

## Setup

`pnpm add posthog-js posthog-node`, then fill `NEXT_PUBLIC_POSTHOG_KEY` and `POSTHOG_KEY` in `.env` with the same project API key. `NEXT_PUBLIC_POSTHOG_HOST` only matters on EU cloud; `POSTHOG_HOST` can stay empty.

The server falls back to the `NEXT_PUBLIC_` values when the plain ones are empty, so setting only the public pair works. Setting `POSTHOG_KEY` explicitly is still preferred: `NEXT_PUBLIC_*` is inlined at build time, so rotating that key needs a rebuild, whereas `POSTHOG_KEY` is read at cold start. Analytics is off only when both keys are empty — that is how CI and forks run without a PostHog project.

Group types are created automatically the first time an event carries one; nothing needs registering. Settings → Customer Analytics in PostHog only renames or deletes them, and a project may have at most five. Querying *by* group is a paid PostHog add-on — sending the group always ingests fine, but the organization dimension is only filterable once that add-on is on.

## Not connected to the super-admin dashboard

`app/(super-admin)/admin/*` reads the app's own Postgres through Prisma and is untouched by any of this. PostHog data would only appear there via a separate server-side fetch against PostHog's Query API, which needs a personal API key (not the project key). Not built.