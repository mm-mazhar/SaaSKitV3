// app/api/test/stripe-config/route.ts
// TEMPORARY - Remove after debugging

import { PRICING_PLANS } from '@/lib/constants'
import { NextResponse } from 'next/server'

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  return NextResponse.json({
    plans: PRICING_PLANS.map(p => ({
      title: p.title,
      stripePriceId: p.stripePriceId || 'NOT SET',
      credits: p.credits
    })),
    envVars: {
      STRIPE_PRICE_ID_PLAN_A: process.env.STRIPE_PRICE_ID_PLAN_A ? 'SET' : 'NOT SET',
      STRIPE_PRICE_ID_PLAN_B: process.env.STRIPE_PRICE_ID_PLAN_B ? 'SET' : 'NOT SET',
      STRIPE_PRICE_ID_PLAN_C: process.env.STRIPE_PRICE_ID_PLAN_C ? 'SET' : 'NOT SET',
      STRIPE_PRICE_ID_PLAN_D: process.env.STRIPE_PRICE_ID_PLAN_D ? 'SET' : 'NOT SET',
    }
  })
}
