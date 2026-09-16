// app/lib/supabase/server.ts

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Request-deduplicated current-user lookup.
 *
 * `supabase.auth.getUser()` makes a network round trip to Supabase Auth to
 * validate the session on every call. Before this helper existed, the root
 * layout, the dashboard layout, individual page.tsx files, and the oRPC
 * context (lib/orpc/context.ts) each called `createClient()` + `getUser()`
 * independently -- so a single dashboard navigation triggered 3-5 of these
 * round trips back-to-back (on top of the one proxy.ts/middleware already
 * makes), which is exactly what was showing up as multi-second page loads.
 *
 * Wrapping it in React's `cache()` makes every call within the same request
 * share one in-flight/resolved call instead of firing a new one each time --
 * the same "request memoization" pattern Next.js uses for `fetch()`. This
 * only dedupes within the App Router's Server Component render tree for a
 * single request; it does NOT cover proxy.ts (Edge middleware runs in a
 * separate phase before the render tree exists) or any Route Handler that
 * doesn't go through this helper.
 */
export const getCachedUser = cache(async () => {
  const supabase = await createClient()
  return supabase.auth.getUser()
})
