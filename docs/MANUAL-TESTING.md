# SaaS Kit v3: Master QA & Verification Checklist

This document consolidates all manual tests required to verify Multi-Tenancy, RBAC, Billing (with Credit Transfers), Security, and Automated Jobs.

**Prerequisites:**
- Database reset recommended (`npx prisma migrate reset`) to ensure schema alignment.
- Stripe CLI running (`stripe listen --forward-to localhost:3000/api/webhook/stripe`).
- Local server running (`npm run dev`).
- **Email Testing:** Watch your console logs (if Resend dev mode) or check the email inbox defined in `.env`.

---

## 1. Onboarding & Multi-Tenancy Structure

**NOTE: ONLY SECONDARY ORGANZIATION CAN BE DELETED.**

### ✅ Test 1.1: New User Default State
**Goal:** Verify a new user gets an organization and it's name taken from it's email with `_xxxx` (4 random digits) and default credits.
- [ ] **Action:** Go to `/get-started` and sign up with a fresh email, try Google Auth and Email Auth.
- [ ] **Verify (UI):** Dashboard Sidebar shows it's organization name striped from it's email with `_xxxx` 
- [ ] **Verify (UI):** Topbar shows **Credits: 0** or whatever credits set in `prisma.schema` or `/lib/constant.ts` files. -> Change later to set credits either from `prisma.shema` or `lib/constant.ts` file.
- [ ] **Verify (DB):** `Organization` table has 1 row. `isPrimary` is `true`. `credits` is equal to allowed credits set in `prisma.schema` or `/lib/constant.ts` files.
- [ ] `Free User` should not be able to create organization and new workspace.
- [X] `Free User` should not be able to send invite (check it is allowed currently). If it is allowed then we see should disallow.

### ✅ Test 1.2: Data Isolation
**Goal:** Verify data does not leak between organizations.
- [ ] **Action:** Create a second organization (e.g., "Work Corp").
- [ ] **Action:** Switch to "Work Corp" via the Team Switcher.
- [ ] **Action:** Create a Workspace "Project Alpha".
- [ ] **Action:** Switch back to "First/Other Organization" or "Other Org".
- [ ] **Verify (UI):** "Project Alpha" should **NOT** be visible in the `First/Other Organization` or across different Orgs and vice versa.

---

## 2. Billing, Credits & Transfers

### ✅ Test 2.1: Paid plan Subscription
**Goal:** Verify paying updates the Organization's wallet, not the User's.
- [ ] **Action:** As Owner, switch to "Work Corp". Go to Billing.
- [ ] **Action:** Buy "Starter (One time)", "Team" or "Agency" or "Partner" Plans, using Stripe Test Card (`4242...`).
- [ ] **Verify (UI):** Topbar credits increase by `50` or `whatever the credit limits set for each plan`.
- [ ] **Verify (DB):** `Organization` table `credits` updated, and `stripeCustomerId` (will be empty in case of one time purchase plan) exists now. Column in org table added `oneTimePlanId` for `Starter (one-time)` plan, it should be filled in case of `Starter (one-time)` plan.
- [ ] **Verify (DB):** `Subscription` table `planId` column updated with correct `price_id` ~~(won't be any record in case of one time purchase)~~
- [ ] **Verify (DB):** `Subscription` table `organizationId` populated with right `id` of `Organization` table. (won't be any record in case of one time purchase)
- [ ] **Verify (UI):** Set `credits` columns in `Organization` table below `20` and check `Billing` page. Is it allowing to Re-new Subscription?
- [ ] **Verify:** Email Recieved upon subscription.
- [ ] **Action:** As Owner/Admin, Upgrade subscription to 'other plans'
- [ ] **Verify:** Admin can be without financial access.

### ✅ Test 2.2: Subscription Logic
**Goal:** Verify subscribing unlocks Pro features for the whole team.
- [ ] **Action:** As Owner, subscribe "Work Corp" to the **Pro Plan**.
- [ ] **Verify (UI):** Topbar shows "Pro" badge.
- [ ] **Verify (DB):** `Subscription` table has `organizationId` populated.

### ✅ Test 2.3: Zombie Subscription Prevention
**Goal:** Verify deleting an organization cancels the Stripe subscription.
- [ ] **Action:** As Owner of a Org with `Subscription` or `One_time` plan, go to `Settings -> Delete Organization`.
- [ ] **Verify**: Does it allow to transfer credits? (Also, zero the credits of deleting org)
- [ ] **Verify (Stripe Dashboard):** The `subscription` table `status` column should immediately change to **Canceled**.

### ✅ Test 2.4: Credit Transfer (Subscription)
**Goal:** Verify transferring credits works even when cancelling a subscription simultaneously.
- [ ] **Setup:** "Org" that has active Sub + 100 Credits. "Org Free" has 0.
- [ ] **Action:** Delete "Org Pro". Select transfer to "Org Free".
- [ ] **Verify (DB):** "Org Free" has 100 credits.
- [ ] **Verify (Stripe):** "Org Pro" subscription is Canceled.

---

## 3. RBAC (Roles & Permissions)

### ✅ Test 3.1: Member Restrictions
**Goal:** Verify a standard Member cannot access privileged areas.
- [ ] **Setup:** Log in as Owner (User A). Invite User B as **MEMBER**.
- [ ] **Action:** Log in as User B and accept the invite.
- [ ] **Verify (UI):** Click User Dropdown in Sidebar. "Billing" and "Organization Settings" should be hidden.
- [ ] **Verify (Security):** Manually type `/dashboard/billing`. Should redirect to `/dashboard`.
- [ ] **Verify (Security):** Manually type `/dashboard/settings/organization`. Should redirect to `/dashboard`.
- [ ] User as a `Member` SHOULD NOT BE ABLE TO either `delete` or `rename` workspaces. `3 dots` in project cards for `Members` only must be disabled.
- [ ] Members should not be able to `create` workspaces. They should only be allowed to work in authorized workspaces

### ✅ Test 3.2: Admin Restrictions
**Goal:** Verify an Admin can manage settings but cannot delete the Organization.
- [ ] **Setup:** Promote User B to **ADMIN** (using the Owner account).
- [ ] **Action:** Log in as User B. Go to Organization Settings.
- [ ] **Verify (UI):** The "Danger Zone" (Delete Organization button) should be **hidden** or **disabled** (logic handled in UI code).

---

## 4. Abuse Prevention & Guardrails

Generate a strong CRON secret by running following line in terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- `curl -H "Authorization: Bearer <CRON secret>" http://localhost:3000/api/cron/daily-maintenance`
- `curl -H "Authorization: Bearer <CRON secret>" http://localhost:3000/api/cron/notify`

For Production, Run in Browser DevTools Console:
```
- fetch('https://your-production-domain.com/api/cron/daily-maintenance', {
  headers: { Authorization: 'Bearer <CRON_SECRET>' }
}).then(r => r.text()).then(console.log)

- fetch('https://your-production-domain.com/api/cron/notify', {
  headers: { Authorization: 'Bearer <CRON_SECRET>' }
}).then(r => r.text()).then(console.log)
```

### ✅ Test 4.1: The "Infinite Credit" Loophole
**Goal:** Ensure creating multiple organizations does not grant free credits.
- [ ] **Action:** Create a new Organization (e.g., "Farm Org 1").
- [ ] **Verify (UI):** Topbar should show **Credits: 0**.
- [ ] **Verify (DB):** `Organization` table row should have `isPrimary`: `false`.

### ✅ Test 4.2: Primary-Only Refill (Time Travel)
**NOTE: FOLLOWING TEST IS INVALID NOW SINCE NEW PRICING STRATEGY IMPLEMENTED**
- Free monthly refill logic was removed from daily-maintenance cron.
- Cron now only does cleanup of soft-deleted orgs, so response like {"success":true,"orgsCleanedUp":0} is expected.
- Your primary org credits should not auto-refill to 5 (or any free amount) anymore.
- Credits should only change via paid events (subscription renewals or one-time Basic purchases), not via that cron.
- 
**Goal:** Ensure only the Primary Org gets the monthly refill.
- [ ] **Setup:** In Prisma Studio, find a Secondary Org (Credits: 0) and the Default Org or Primary Organization `isPrimary`: `true` (Credits: 1).
- [ ] **Action:** Set `lastFreeRefillAt` for **both** orgs to 2 months in the past.
- [ ] **Action:** Trigger Cron: `curl -H "Authorization: Bearer <CRON secret>" http://localhost:3000/api/cron/daily-maintenance`.
- [ ] **Verify (DB):**
    -   Default Org (`isPrimary: true`): Credits should update to **5** whatever credits set in `prisma.schema` or `/lib/constant.ts` files.
    -   Secondary Org (`isPrimary: false`): Credits should **remain 0**.

### ✅ Test 4.3: Invite Spamming
**Goal:** Verify rate limits on invitations.
- [ ] **Action:** Send an invite to `test1@example.com`.
- [ ] **Action:** Immediately try to send another to `test2@example.com`.
- [ ] **Verify (UI):** Should show error: "Please wait 1 minute before sending another invite."

### ✅ Test 4.4: Server-Side Blocking (Invites)
**Goal:** Verify API guardrails.
- [ ] **Action:** In Dashboard, open "Invite Member". Enter `spam@guerrillamail.com`.
- [ ] **Verify (UI):** Toast Error: "Disposable emails cannot be invited..."

---

## 5. Security: Disposable Email Blocking

### ✅ Test 5.1: Client-Side Blocking (Sign Up)
**Goal:** Verify blocking happens before API calls.
- [ ] **Action:** Go to `/get-started`. Enter `test@mailinator.com`. Click "Send Magic Link".
- [ ] **Verify (UI):** Immediate error message: "Please use a permanent email address...".
- [ ] **Verify (Network Tab):** No request sent to Supabase.

---

## 6. Transactional Emails (Receipt & Content)

### ✅ Test 6.1: Payment Confirmation Email
**Goal:** Verify Owner receives email after paying.
- [ ] **Action:** Perform Test 3.1 (Price Plan).
- [ ] **Verify (Content):**
    -   Subject: "Payment Confirmation - [Org Name]".
    -   Body: Mentions "Price Plan" Name and the Organization Name.
    -   Button: Blue "View Invoice".

### ✅ Test 6.2: Cancelation Schedule Email
**Goal:** Verify Owner receives email after cancelation.
- [ ] **Action:** Perform Test 3.1 (Price Plan).
- [ ] **Verify (Content):**
    -   Subject: "Cancellation Scheduled - [Org Name]".
    -   Body: Mentions "Price Plan" and the Organization Name.
    -   Button: Blue "Go to Billing".

### ✅ Test 6.3: Cancellation Email (Final)
**Goal:** Verify email reflects deletion and credit transfer.
- [ ] **Action:** Perform Test 3.5 (Delete Org with Transfer).
- [ ] **Verify (Content):**
    -   Subject: "Subscription Canceled - [Org Name]".
    -   Body: "Your remaining X credits have been transferred to **[Target Org]**."
    -   **Critical:** "Go to Billing" button is **NOT** present.
    -   **Critical:** "Reactivate" text is **NOT** present.

### ✅ Test 6.3: Invitation Email
**Goal:** Verify correct link and role.
- [ ] **Action:** Invite `friend@example.com` as `ADMIN`.
- [ ] **Verify (Content):** Body says "...join [Org Name]". Link points to `/invite/[token]`.

---

## 7. Automated Jobs (Cron) & Alerts

### ✅ Test 7.1: Low Credits Alert
**Goal:** Verify `notify` cron sends email when credits are low.
- [ ] **Setup (DB):** Set `credits` to **4** (or below threshold, set in `/lib/constants.ts`, i.e. `CREDIT_REMINDER_THRESHOLD`) and `creditsReminderThresholdSent` to `false` for an Organization.
- [ ] **Action:** Run `curl -H "Authorization: Bearer <CRON secret>" http://localhost:3000/api/cron/notify`.
- [ ] **Verify (Inbox):** "Low Credits Alert" email received.
- [ ] **Verify (DB):** `creditsReminderThresholdSent` is now `true`.

### ✅ Test 7.2: Renewal Reminder
**Goal:** Verify `notify` cron sends email 3 days before renewal.
- [ ] **Setup (DB):** Set Subscription `currentPeriodEnd` to **(Today + 3 Days)** in Unix timestamp. Set `periodEndReminderSent` to `false`.
- [ ] **Action:** Run `curl -H "Authorization: Bearer <CRON secret>" http://localhost:3000/api/cron/notify`.
- [ ] **Verify (Inbox):** "Upcoming Subscription Renewal" email received.
- [ ] **Verify (DB):** `periodEndReminderSent` is now `true`.

### ✅ Test 7.3: Daily Maintenance (Refill & Cleanup)
**NOTE: FOLLOWING TEST IS VALID ONLY FOR DELETING ORGANIZATION NOW.**
**Goal:** Verify `daily-maintenance` handles refills and deletes old data.
- [ ] **Setup (DB):**
    1.  Find Default Org (`isPrimary: true`). Set `lastFreeRefillAt` to 2 months ago. Set `credits` to 1.
    2.  Find Secondary Org (`isPrimary: false`). Set `lastFreeRefillAt` to 2 months ago. Set `credits` to 0.
    3.  Find a deleted Org (`deletedAt` exists). Set `deletedAt` to 31 days ago.
- [ ] **Action:** Run `curl -H "Authorization: Bearer <CRON secret>" http://localhost:3000/api/cron/daily-maintenance`.
- [ ] **Verify (DB):**
    -   Default Org: Credits updated to **5**.
    -   Secondary Org: Credits remain **0**.
    -   Deleted Org: Row is completely **GONE** (Hard deleted).
    -   Subscription: if exists in stripe, also goes away.

### ✅ Test 7.4: Daily Maintenance (Refill & Cleanup)
**Goal:** Verify `daily-maintenance` handles NOT refills organizations with `Active` Subscription.
- [ ] **Setup (DB):**
    1.  Find Default Org (`isPrimary: true`). Set `lastFreeRefillAt` to 2 months ago. Set `credits` to 1. and with `Active` Subscription
    2.  Find Secondary Org (`isPrimary: false`). Set `lastFreeRefillAt` to 2 months ago. Set `credits` to 0 and with `Active` Subscription
    3.  Find a deleted Org (`deletedAt` exists). Set `deletedAt` to 31 days ago. This org also has `Active` ? (WHEN DELETING AN ORG, CREDISTS ARE TRANSFERED AND SUBS IS CANCELED, SO STATUS SHOULD BE `canceled`) Subscription
- [ ] **Action:** Run `curl -H "Authorization: Bearer <CRON secret>" http://localhost:3000/api/cron/daily-maintenance`.
- [ ] **Verify (DB):**
    -   Organization with `Active` Subscripitons won't get credits refilled.
    -   Deleted Org: Row is completely **GONE** (Hard deleted).
    -   Subscription: if exists in stripe, also goes away.

## Test 8: oRPC Routes

### ✅ Test 8.1: Check Routes are only accessible to super-admin
**Goal:** Verify `http://localhost:3000/docs/api` and `http://localhost:3000/api/openapi.json` only accessible to super-admins.
- [ ] **Verify: copy and paste links in web browser and check

## Test 9: Run Test

### ✅ Test 9.1: Run Tests
- [ ] **Run and Verify: `npx tsc --noEmit`
- [ ] **Run and Verify: `npm test tests/orpc`
- [ ] **Run and Verify: `npm run test`
- [ ] **Run and Verify: `npx vitest run --reporter=verbose 2>&1`

---

## 10. Workspace, Billing Delegation & Plan-Visibility Changes (Added: Sept 2026 session)

These items surfaced once workspace creation, billing access, and pricing plans got tied together more tightly. Automated tests cover the logic, but the items below are worth clicking through manually since this area has produced real bugs before (workspace creation by Members, stale plan badges, disabled plans still showing in the UI).

### ✅ Test 10.1: Workspace Creation Locked to Admin/Owner
**Goal:** Verify a `MEMBER` cannot create a workspace even by calling the API directly, not just that the button is hidden.
- [ ] **Setup:** Log in as a `MEMBER` of an organization (see Test 3.1 setup).
- [ ] **Verify (UI):** The "Create Workspace" control is hidden or disabled for the Member.
- [ ] **Verify (Security):** With the Member's session, attempt to hit the workspace-create endpoint directly (e.g. via browser devtools/network replay or a REST client). It should be rejected (403/Forbidden), not silently create a workspace.
- [ ] **Verify (UI, Admin/Owner):** Logged in as `ADMIN` or `OWNER`, workspace creation still works normally.

### ✅ Test 10.2: Plan Badge Reflects Correct Source (One-Time vs Subscription)
**Goal:** Verify the dashboard plan badge doesn't get "stuck" on an old one-time plan after upgrading to a subscription.
- [ ] **Action:** As Owner, buy the **Starter (One-time)** plan for an Organization.
- [ ] **Verify (UI):** Badge shows "Starter".
- [ ] **Verify (DB):** `Organization.oneTimePlanId` is set to the Starter plan id.
- [ ] **Action:** From the same Organization, subscribe to **Team** or **Agency** (a recurring plan).
- [ ] **Verify (UI):** Badge now shows the new subscription plan ("Team"/"Agency"), not "Starter".
- [ ] **Verify (DB):** `Organization.oneTimePlanId` is cleared (`null`) once the subscription webhook processes. `Subscription.planId` reflects the new plan.

### ✅ Test 10.3: Owner-Controlled Billing Access for Admins
**Goal:** Verify an Owner can delegate billing management to a specific Admin, and that it can be revoked.
- [ ] **Setup:** As Owner, invite a new member and check the "Allow billing management" (or equivalent) option while setting their role to `ADMIN`.
- [ ] **Verify (UI):** After the invite is accepted, that Admin CAN access `/dashboard/billing` and perform billing actions (upgrade/cancel), even though they are not the Owner.
- [ ] **Verify (DB):** `OrganizationMember.canManageBilling` is `true` for that member.
- [ ] **Action:** As Owner, toggle the billing-access permission OFF for that Admin from Organization Settings (without changing their role).
- [ ] **Verify (UI):** That Admin immediately loses access to `/dashboard/billing` (redirected, same as a plain Member would be).
- [ ] **Action:** As Owner, demote that same user from `ADMIN` to `MEMBER`.
- [ ] **Verify (DB):** `canManageBilling` is cleared back to `false` on demotion (shouldn't silently persist for a Member).
- [ ] **Verify (Security):** A plain `MEMBER` (never granted the flag) still cannot access `/dashboard/billing`, matching Test 3.1.

### ✅ Test 10.4: Partner Plan Kill-Switch (`PARTNER_PLAN_ENABLED`)
**Goal:** Verify turning the Partner plan off (`PARTNER_PLAN_ENABLED = false` in `lib/constants.ts`) cleanly hides it everywhere a *new* purchase could happen, without breaking existing Partner subscribers or the page layouts.
- [ ] **Setup:** Set `PARTNER_PLAN_ENABLED` to `false` and restart the dev server.
- [ ] **Verify (UI - Marketing):** On the public pricing page (`/`), the Partner card is gone, and the remaining plan cards resize/re-center nicely (no leftover empty column, no awkward stretched/squashed card).
- [ ] **Verify (UI - Billing Page):** On `/dashboard/billing`, the "Upgrade to Partner" card is gone from the upgrade section, and the grid of remaining upgrade cards re-flows (2 or 3 cards look intentional, not like a 4-column grid with a gap).
- [ ] **Verify (UI - Nav Dropdown):** The user-nav "Upgrade to Partner" prompt in the sidebar dropdown no longer appears for an Agency-plan org (it should now either show nothing or the next real upgrade target).
- [ ] **Verify (Security):** Attempt to subscribe to the Partner plan directly via the API/network tab (bypassing the hidden UI). It should be rejected, not silently charge/create a subscription.
- [ ] **Verify (Existing Subscribers):** An organization that was already on the Partner plan *before* the flag was disabled keeps its badge, credits, and billing page working normally (it should NOT be forced to downgrade or show broken UI).
- [ ] **Cleanup:** Set `PARTNER_PLAN_ENABLED` back to `true` and confirm the Partner card reappears everywhere above.

### ✅ Test 10.5: Dashboard Load / Session Consistency
**Goal:** Sanity-check the request-level auth caching (`getCachedUser`) didn't introduce stale-session or cookie glitches.
- [ ] **Action:** Log in, then navigate across several dashboard pages in a row (Dashboard → Billing → Settings → Organization Settings) using the sidebar links.
- [ ] **Verify (UI):** No flicker back to a logged-out/redirect state, no "wrong organization" flash, and pages feel noticeably snappier than a full re-auth round trip on every page.
- [ ] **Action:** Open a second tab to the dashboard while the first tab is still open.
- [ ] **Verify (UI):** Both tabs show the same logged-in user/organization; logging out in one tab and refreshing the other correctly reflects the logged-out state (no stale cached session bleeding across page loads).
