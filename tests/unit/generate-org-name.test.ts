// tests/unit/generate-org-name.test.ts
// Unit tests for the email-derived default organization name (no DB required).

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { generateOrgNameFromEmail } from '@/lib/utils'

describe('generateOrgNameFromEmail', () => {
  it('takes the local part before @ and appends _ + 4 digits', () => {
    const name = generateOrgNameFromEmail('xyz@gmail.com')
    expect(name).toMatch(/^xyz_\d{4}$/)
  })

  it('never includes the domain or the @ symbol', () => {
    const name = generateOrgNameFromEmail('someone@example.com')
    expect(name).not.toContain('@')
    expect(name).not.toContain('example')
    expect(name).not.toContain('.com')
  })

  it('produces different suffixes across calls (random, not deterministic)', () => {
    const names = new Set(Array.from({ length: 20 }, () => generateOrgNameFromEmail('xyz@gmail.com')))
    // Extremely unlikely all 20 collide on the same 4-digit suffix if it's truly random.
    expect(names.size).toBeGreaterThan(1)
  })

  it('falls back to "user" for an email with no local part', () => {
    const name = generateOrgNameFromEmail('@gmail.com')
    expect(name).toMatch(/^user_\d{4}$/)
  })

  it('falls back to "user" for a malformed/empty string', () => {
    const name = generateOrgNameFromEmail('')
    expect(name).toMatch(/^user_\d{4}$/)
  })

  it('trims a very long local part so the result stays within a sane length', () => {
    const longLocalPart = 'a'.repeat(100)
    const name = generateOrgNameFromEmail(`${longLocalPart}@example.com`)
    // 20 chars reserved as local-part budget minus "_" and 4 digits.
    expect(name.length).toBeLessThanOrEqual(20)
    expect(name).toMatch(/^a+_\d{4}$/)
  })

  it('always ends with an underscore followed by exactly 4 digits, for arbitrary emails', () => {
    fc.assert(
      fc.property(fc.emailAddress(), (email) => {
        const name = generateOrgNameFromEmail(email)
        expect(name).toMatch(/_\d{4}$/)
        expect(name).not.toContain('@')
      })
    )
  })
})
