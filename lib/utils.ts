// lib/utils.ts

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Generates a default organization name from a user's email address.
 * Takes the local part of the email (before the @ symbol) and appends
 * an underscore plus 4 random digits, e.g. "xyz@gmail.com" -> "xyz_4821".
 * Truncates the local part as needed to respect the 20-char DB column limit.
 */
export function generateOrgNameFromEmail(email: string): string {
  const localPart = (email.split('@')[0] || 'user').trim() || 'user'
  const suffix = Math.floor(1000 + Math.random() * 9000).toString()
  const maxLocalPartLength = 20 - 1 - suffix.length // reserve room for "_" + 4 digits
  const trimmedLocalPart = localPart.slice(0, maxLocalPartLength) || 'user'
  return `${trimmedLocalPart}_${suffix}`
}
