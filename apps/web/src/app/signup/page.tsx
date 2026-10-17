'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button, ErrorState, Input, Label, Logo } from '@appraiseme/ui'
import { BRAND } from '@appraiseme/config'
import { AppError } from '@appraiseme/domain'

export default function SignUpPage() {
  const router = useRouter()
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmationNeeded, setConfirmationNeeded] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await signUp(email, password, displayName || undefined)
      if (result.needsConfirmation) {
        setConfirmationNeeded(true)
      } else {
        router.push('/')
      }
    } catch (err) {
      setError(
        err instanceof AppError
          ? err.message
          : 'Sign up failed. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  if (confirmationNeeded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-canvas px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="flex justify-center">
            <Logo size={48} />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-fg-primary">
            {BRAND.name}
          </h1>
          <p className="text-sm text-fg-secondary">
            Check your email for a confirmation link to complete sign up.
          </p>
          <Button variant="secondary" onClick={() => router.push('/login')}>
            Back to sign in
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-canvas px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="flex justify-center">
            <Logo size={48} />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-fg-primary">
            {BRAND.name}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">Create your account</p>
        </div>

        {error && <ErrorState title="Sign up failed" description={error} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="displayName">Display name (optional)</Label>
            <Input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign up'}
          </Button>
        </form>

        <p className="text-center text-sm text-fg-muted">
          Already have an account?{' '}
          <button
            onClick={() => router.push('/login')}
            className="text-accent hover:text-accent-hover"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}
