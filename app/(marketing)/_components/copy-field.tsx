// app/(marketing)/_components/copy-field.tsx

'use client'

import { useToast } from '@/components/ToastProvider'
import { Button } from '@/components/ui/button'
import { Copy } from 'lucide-react'

interface CopyFieldProps {
  value: string
  /** Accessible name for the copy button, e.g. "Copy email address". */
  copyLabel: string
}

/** Read-only value with a copy-to-clipboard button. */
export function CopyField({ value, copyLabel }: CopyFieldProps) {
  const { show } = useToast()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      show({ title: 'Copied', description: value, variant: 'success', duration: 1500 })
    } catch {
      show({ title: 'Copy failed', description: 'Select the text and copy it manually.', variant: 'error', duration: 2500 })
    }
  }

  return (
    <div className='cyber-chamfer-sm cyber-edge bg-background flex items-center justify-between gap-2 rounded-md border py-1 pr-1 pl-3'>
      <span className='truncate font-mono text-sm'>{value}</span>
      <Button variant='ghost' size='icon' onClick={copy} aria-label={copyLabel}>
        <Copy />
      </Button>
    </div>
  )
}
