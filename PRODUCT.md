# SaaS Kit v3 — Product Definition

**Last updated:** 2026-09-26  
**Branch:** chore/ui-design  
**Platform:** Web (Next.js 16 + React 19)  
**Status:** Production-ready SaaS starter template

---

## What This Is

A **full-featured SaaS starter kit** built for teams launching subscription-based products. It's designed as both a reference architecture and a launch platform—drop in your branding, connect your services, ship in days.

The kit models a modern B2B SaaS with:
- Multi-tenant organizations and workspaces
- Team member management with role-based access (OWNER, ADMIN, MEMBER)
- Subscription billing via Stripe (recurring + usage-based credits)
- Type-safe API layer (oRPC with OpenAPI docs)
- Super admin analytics and system monitoring
- Supabase Auth + email/OAuth login
- Database: Postgres with Prisma ORM

---

## Core Value Proposition

**For founders & teams:** Deploy a complete, proven SaaS backend in hours. Skip the auth, billing, RBAC, and multi-tenancy scaffolding. Focus on product.

**For engineers:** Learn how to build scalable SaaS architectures. Reference implementations for auth, database design, API patterns, and role-based access control.

**For designers:** A modular, well-organized component system with clear patterns for building admin UIs, user dashboards, and billing flows.

---

## Key Surfaces & Flows

### Public Marketing Site
**Routes:** `/`, `/about`, `/get-started`, `/faqs`, `/contact`, `/terms`, `/privacy-policy`

**Audience:** Prospective customers, evaluators, decision makers  
**Goal:** Convert visitors to sign up or request a demo  
**Visual tone:** Modern, clean, minimalist. Emphasizes simplicity and power.

**Key sections:**
- Hero with value prop and CTA
- Features overview
- FAQs
- Team/about section
- Call-to-action buttons leading to signup
- Contact and support references

---

### Authentication & Onboarding
**Routes:** `/auth/*`, `/invite/[token]`, `/get-started`

**Audience:** First-time users, invited team members  
**Goal:** Sign up, verify email, create org, invite team, start using  
**Key interactions:**
- Email magic link auth
- Google OAuth
- Org creation (first run)
- Workspace creation
- Member invitations (via token)
- Terms/privacy acknowledgment

**Design constraints:**
- Minimize friction. Users should go from "I clicked signup" to "I'm using the product" in <5 minutes.
- Clear error handling and validation feedback
- Redirect patterns guide users through workspace creation if missing

---

### User Dashboard (Authenticated)
**Routes:** `/dashboard/*`

**Audience:** Team members, workspace owners  
**Goal:** Primary workspace. Access tools, settings, billing, team management

**Key sections:**
1. **Sidebar navigation** — Org/workspace switcher, main nav, user menu
2. **Main content area** — Workspace-specific pages (data, documents, settings, billing)
3. **Topbar** — Breadcrumbs, actions, user profile menu

**Key pages:**
- `/dashboard` — Overview/welcome
- `/dashboard/data` — Sample data browsing
- `/dashboard/documents` — Document management
- `/dashboard/billing` — Subscription status, payment methods, invoices
- `/dashboard/settings` — Org settings, member management, workspace settings
- `/dashboard/settings/organization` — Org name, logo, deletion

**Key interactions:**
- Org switching (sidebar)
- Workspace switching (sidebar dropdown)
- Member invitations (with role selection)
- Role-based visibility (show/hide actions based on RBAC)
- Stripe payment portal access
- Subscription upgrade/downgrade flows

---

### Billing & Payments
**Routes:** `/dashboard/billing`, `/dashboard/payment/*`

**Goal:** Manage subscriptions, refill credits, view invoices, upgrade plans  
**Integrations:** Stripe (subscriptions, payment methods, invoices)

**Key flows:**
- Subscribe to plan (free → starter → pro)
- Refill usage credits
- Update payment method (→ Stripe Portal)
- View billing history
- Cancel subscription

**Design notes:**
- Clear pricing and plan comparison
- Transparent credit usage
- Successful/failed payment confirmations

---

### Super Admin Dashboard
**Routes:** `/admin/*`

**Audience:** Internal admin/ops team  
**Goal:** System monitoring, revenue tracking, user/org management

**Key pages:**
- `/admin` — Overview (user count, revenue, recent signups)
- `/admin/users` — User table with search, role assignment
- `/admin/organizations` — Org table, filter by status
- `/admin/subscriptions` — Billing data, churn analysis
- `/admin/organizations/[id]` — Org detail, members, workspace count

**Key metrics:**
- Total users, active users, churn
- MRR, ARR, total revenue
- User growth chart
- Revenue breakdown by plan
- Recent activity log

**Design notes:**
- Data-dense but scannable
- Charts for trend visualization
- Bulk actions (disable user, refund, etc.)
- Role protection — only super admins see this

---

## Information Architecture

```
/ (public)
├── / (marketing home)
├── /about, /about2
├── /get-started (lead capture / signup redirect)
├── /faqs
├── /contact
├── /terms, /privacy-policy
└── /auth/* (auth flows, errors)

/dashboard (authenticated user)
├── / (welcome/overview)
├── /data (sample data browsing)
├── /documents (user documents)
├── /billing (subscription, payments, invoices)
├── /settings (org & workspace settings)
└── /settings/organization (org info, deletion)

/invite/[token] (public, but requires link)
└── Accept org membership invitation

/admin/* (super admin only)
├── / (dashboard overview)
├── /users (user management)
├── /organizations (org management)
├── /subscriptions (billing analytics)
└── /organizations/[id] (org detail)
```

---

## Design System & Components

### Visual Language
- **Color:** Light/dark mode support via next-themes
- **Components:** Shadcn/ui (Radix UI primitives + Tailwind)
- **Layout:** Sidebar + topbar patterns for admin UIs
- **Motion:** Framer Motion for transitions (hero animations, etc.)
- **Icons:** Lucide React

### Key Component Patterns

**Sidebar:**
- Org/workspace switcher at top
- Main navigation (dashboard, docs, settings, billing)
- User menu at bottom
- Responsive: collapses on mobile

**Topbar:**
- Breadcrumbs or page title
- Action buttons (create, export, etc.)
- User menu / theme toggle

**Dialogs:**
- Create org / workspace
- Invite member
- Delete confirmation
- Rename org

**Tables:**
- Users, orgs, subscriptions in admin
- Search, sort, filter, bulk select
- Pagination
- Data export (planned)

**Forms:**
- Inline edit (org name, settings)
- Multi-step (org creation, member invite)
- Validation feedback

**Cards:**
- Plan cards (pricing)
- Metric cards (dashboard)
- User cards (member list)

### Color & Theming
- Primary brand color (TBD by user — currently uses Shadcn defaults)
- Semantic colors: success (green), error (red), warning (yellow), info (blue)
- Dark mode via `next-themes`
- Text: high contrast for accessibility
- Borders: subtle, 1px, medium-gray in light mode

### Typography
- Font stack: Tailwind defaults (system fonts)
- Scale: Heading (2xl–4xl), body (sm–lg), caption (xs)
- Semantic meaning: h1 for page title, h2 for section, etc.

---

## User Roles & Permissions

### RBAC Model
- **OWNER:** Full control. Billing, member management, org deletion, all workspace actions.
- **ADMIN:** Workspace admin. Member management within workspace, workspace deletion (if allowed), all workspace actions.
- **MEMBER:** Read/execute only. Access workspace tools, no member/billing management.

### UI Enforcement
- Actions hidden/disabled based on role
- Settings pages restricted to OWNER/ADMIN
- Billing page restricted to OWNER

---

## Key Flows & Use Cases

### 1. Sign Up & Org Creation (First Run)
1. User clicks "Get Started"
2. Sign up form (email or Google OAuth)
3. Email verification (magic link)
4. Org creation form
5. Workspace auto-created
6. Invited to accept terms
7. → Dashboard (welcome state)

### 2. Add Team Members
1. Owner/Admin visits `/dashboard/settings/organization`
2. Clicks "Invite Member"
3. Enters email + role
4. Invite link sent (via Resend)
5. Recipient clicks link → `/invite/[token]`
6. Joins org
7. → Dashboard

### 3. Subscribe to Plan
1. User visits `/dashboard/billing`
2. Sees current plan (free) and available upgrades
3. Clicks "Upgrade to Pro"
4. → Stripe Checkout
5. Payment → webhook updates subscription in DB
6. → Success page, then dashboard
7. User can now use pro features

### 4. Admin Review User/Org
1. Super admin visits `/admin/users` or `/admin/organizations`
2. Searches by email/org name
3. Clicks row to view detail
4. Can disable user, change role, refund charge, etc.
5. Changes reflected in real-time

---

## Technical Constraints & Decisions

### Frontend
- **Framework:** Next.js 16 (App Router, Server Components)
- **UI Library:** Shadcn/ui (Radix UI + Tailwind CSS)
- **State:** TanStack Query for server state
- **Validation:** Zod for form/API schemas
- **Styling:** Tailwind CSS + CSS modules (rare)

### Backend
- **API:** oRPC (type-safe RPC + OpenAPI)
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **Auth:** Supabase Auth (magic links, OAuth)
- **Payments:** Stripe API
- **Email:** Resend
- **Analytics:** PostHog

### Data Model
- **Organizations** — multi-tenant containers
- **Workspaces** — org sub-divisions (optional, but included)
- **Users** — auth identity
- **Members** — user + org + role join
- **Subscriptions** — Stripe subscription + local tracking
- **Credits** — usage-based billing

### Security
- Row-Level Security (RLS) on all DB queries
- RBAC enforced at API and UI layers
- CORS, CSRF tokens, secure cookies
- No secrets in frontend (via Zod schemas)
- Webhook signature verification (Stripe)

---

## Brand & Voice

**Tone:** Professional but approachable. Confident, not arrogant. Clear, not jargony.

**Voice Guidelines:**
- "Get started" not "Begin your journey"
- "Invite a teammate" not "Manage personnel"
- "Upgrade anytime" not "You must commit to annual billing"
- Active voice: "You'll see results" not "Results will be seen"

**Visual Identity:**
- Minimalist design (whitespace is a feature)
- Purposeful color (not rainbow)
- Real human faces (not illustrations)
- Clarity over cleverness

---

## Success Metrics

### User Perspective
- Time to first value: <5 min from signup to using a feature
- Churn rate: <5% monthly
- NPS: >50

### Product Perspective
- API response time: <200ms p95
- Uptime: 99.9%
- Mobile usability: Touch-friendly, responsive design

### Business Perspective
- Conversion rate: Visitor → trial → paying customer
- Revenue retention: Users who retain their subscription after 30 days
- Expansion: Users upgrading to higher plans

---

## Future Considerations

- **Customizable pricing** — Let founders define their own plans/tiers
- **Workspace templates** — Pre-configured dashboards for different industries
- **White-label** — Custom domain, branding, email templates
- **Advanced RBAC** — Custom roles, permission matrix
- **Data export** — CSV, JSON exports for analytics
- **API rate limiting** — Enforce quotas per plan
- **Webhook infrastructure** — Let products send webhooks to 3rd parties

---

## Files & References

- **Config:** `next.config.js`, `tailwind.config.js`, `tsconfig.json`
- **Components:** `/app/**/_components/**`
- **Routes:** `/app/*` (App Router)
- **Database:** `/prisma/schema.prisma`
- **API:** `/app/api/trpc/*` (oRPC routes)
- **Tests:** `/tests/**`, `/vitest.config.ts`
- **Scripts:** `/scripts/**` (db seeds, domain updates, etc.)

---

## Next Steps for Design Work

1. **Visual refinement:** Audit current Shadcn/ui styling. Add custom colors, typography, spacing.
2. **Brand assets:** Logo, icon set, hero imagery, testimonials for marketing.
3. **Mobile polish:** Responsive layouts, touch targets, navigation patterns.
4. **Micro-interactions:** Loading states, empty states, success confirmations.
5. **Dark mode:** Ensure full parity with light theme.
6. **Accessibility:** WCAG AA compliance, semantic HTML, keyboard navigation.

---

**Drafted by:** Claude Haiku 4.5  
**For:** next-saas-kit-v3 design system documentation
