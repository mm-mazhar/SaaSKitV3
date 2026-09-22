// lib/analytics/events.ts

/**
 * The kit's own lifecycle events.
 *
 * Deliberately limited to plumbing every SaaS built on this kit shares --
 * auth, organizations, billing. Product-specific events belong in the
 * product, not here.
 *
 * Event names are snake_case past-tense facts ("the thing happened"), which
 * is what PostHog's own funnel/retention tooling assumes.
 */
export const ANALYTICS_EVENTS = {
  USER_SIGNED_UP: 'user_signed_up',
  MAGIC_LINK_SENT: 'magic_link_sent',
  OAUTH_COMPLETED: 'oauth_completed',

  ORGANIZATION_CREATED: 'organization_created',
  MEMBER_INVITED: 'member_invited',
  MEMBER_JOINED: 'member_joined',
  ORGANIZATION_SWITCHED: 'organization_switched',

  CHECKOUT_COMPLETED: 'checkout_completed',
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_UPGRADED: 'subscription_upgraded',
  SUBSCRIPTION_DOWNGRADED: 'subscription_downgraded',
  SUBSCRIPTION_CANCELED: 'subscription_canceled',
  PAYMENT_FAILED: 'payment_failed',
} as const

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]

/**
 * PostHog group type for multi-tenancy.
 *
 * Every org-scoped event carries `groups: { organization: <orgId> }` so the
 * whole product can be analysed per tenant (conversion by organization,
 * retention by plan, feature adoption by account) rather than only per user.
 * Retrofitting this later means backfilling every historical event, which
 * PostHog cannot do -- hence wiring it from day one.
 *
 * The group type is created automatically the first time an event carries it,
 * so nothing needs registering. Settings -> Customer Analytics in PostHog is
 * only for renaming or deleting a group type, and a project may have at most
 * five of them.
 *
 * Note: querying by group is a paid PostHog add-on. Sending the group on
 * events costs nothing and is always safe -- the events ingest normally
 * either way -- but the organization dimension only becomes filterable once
 * the add-on is enabled. Sending it from day one is the point: PostHog cannot
 * backfill groups onto events that were already ingested without them.
 */
export const ORGANIZATION_GROUP_TYPE = 'organization'

/**
 * Properties describing an organization, sent alongside org-scoped events so
 * PostHog's group records stay current without a separate sync job.
 */
export type OrganizationGroupProperties = {
  name?: string | null
  plan?: string | null
}
