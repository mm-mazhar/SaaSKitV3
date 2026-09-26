// app/(dashboard)/_components/user-settings-form.tsx

'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/app/(dashboard)/_components/ui/select'
import { useToast } from '@/components/ToastProvider'
import { orpc } from '@/lib/orpc/client'
import { useORPCMutation } from '@/hooks/use-orpc-mutation'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { COLOR_SCHEMES, COLOR_SCHEME_LABELS, isColorScheme, resolveColorScheme, type ColorScheme } from '@/lib/constants'

interface UserSettingsFormProps {
  defaultName: string | null
  defaultEmail: string
  defaultColorScheme: string | null
}

export function UserSettingsForm({ defaultName, defaultEmail, defaultColorScheme }: UserSettingsFormProps) {
  const [name, setName] = React.useState(defaultName ?? '')
  const [colorScheme, setColorScheme] = React.useState<ColorScheme>(resolveColorScheme(defaultColorScheme))
  const { show } = useToast()
  const router = useRouter()

  const { mutate, isPending } = useORPCMutation(() =>
    orpc.user.updateProfile.mutationOptions({
      onSuccess: () => {
        show({ title: 'Saved', description: 'Settings updated successfully', variant: 'success' })
        router.refresh()
      },
      onError: (err: Error) => {
        show({ title: 'Error', description: err.message, variant: 'error' })
      },
    })
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutate({ name, colorScheme })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className='space-y-4'>
        <div className='space-y-1'>
          <Label>Your Name</Label>
          <Input
            type='text'
            placeholder='Your Name'
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className='space-y-1'>
          <Label>Your Email</Label>
          <Input
            type='email'
            placeholder='Your Email'
            disabled
            defaultValue={defaultEmail}
          />
        </div>

        <div className='space-y-1'>
          <Label>Color Scheme</Label>
          <Select
            value={colorScheme}
            onValueChange={(value) => {
              if (isColorScheme(value)) setColorScheme(value)
            }}
          >
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='Select a color' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Color</SelectLabel>
                {COLOR_SCHEMES.map((scheme) => (
                  <SelectItem key={scheme} value={scheme}>
                    {COLOR_SCHEME_LABELS[scheme]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='pt-6'>
        <Button type='submit' disabled={isPending} className='w-fit'>
          {isPending ? 'Saving...' : 'Save Now'}
        </Button>
      </div>
    </form>
  )
}
