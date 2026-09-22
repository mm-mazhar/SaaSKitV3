First, confirm data is arriving. Go to Activity in the left sidebar (direct link: `us.posthog.com/events`). It's a live feed that refreshes every 30 seconds. Sign up with a throwaway email in your app and you should see `magic_link_sent` appear, then `user_signed_up` and `organization_created` once you click the link. Click any row to expand its properties — that's where you'll verify `method: "magic_link"`, `is_primary: true`, and so on are landing the way you expect.

If nothing shows up at all, the usual cause is the key: server events need `POSTHOG_KEY` in your local `.env`, not just the `NEXT_PUBLIC_` one, and Stripe events need s`tripe listen --forward-to localhost:3000/api/webhook/stripe` running or the webhook never fires locally.

Then build insights. Left sidebar → Product analytics → New insight (top right). Trends is the default type; there's a dropdown to switch to Funnel.

Four that are worth building for this kit:

Signup volume — a Trend on `user_signed_up`, then click + Add breakdown and pick the `method` property. You'll get magic link vs OAuth split over time, which tells you whether the Google button is earning its place.

Activation funnel — a Funnel with four steps: `user_signed_up` → `organization_created` → `member_invited` → `checkout_completed`. This is the kit's core journey and the drop-off between steps two and four is the number that actually matters. Set the conversion window generously — 7 or 14 days — since nobody upgrades in one session.

Plan movement — a Trend on `subscription_upgraded` broken down by `to_plan`, with a second series for `subscription_downgraded`. Both carry `from_plan` and `to_plan` as readable titles ("Starter", "Agency"), not price IDs, so the breakdown is legible without a lookup table.

Churn and dunning — a Trend with `subscription_created` and `subscription_canceled` side by side, plus `payment_failed` as a third series. `payment_failed` carries `attempt_count`, so you can filter to `attempt_count >= 2` to separate a card that will retry successfully from one that's genuinely dead.

Save each one and click "Add to dashboard" to collect them onto a single page. Product analytics → Dashboards → New dashboard first if you want a named one rather than the default.

On the organization dimension — this is the part gated behind the paid add-on I mentioned. Once it's enabled, org-scoped events let you ask "how many organizations converted" instead of "how many people", and filter any insight down to one tenant. Until then the events still carry the group and ingest normally, they're just not filterable by it. Everything above works fine without the add-on.

One thing that will look odd at first: billing events show a distinct ID of `organization:<id>` rather than a person, because Stripe webhooks have no user attached. That's deliberate — it keeps machine-originated activity from being counted as a human in your user numbers. The exception is `checkout_completed`, which does get a real user ID when the checkout was started from the dashboard, since the session carries it.