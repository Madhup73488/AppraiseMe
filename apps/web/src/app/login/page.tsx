'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button, ErrorState, Input, Label, Logo } from '@appraiseme/ui'
import { BRAND } from '@appraiseme/config'
import { AppError } from '@appraiseme/domain'

export default function LoginPage() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      router.push('/')
    } catch (err) {
      setError(
        err instanceof AppError
          ? err.message
          : 'Sign in failed. Please try again.',
      )
    } finally {
      setLoading(false)
    }
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
          <p className="mt-1 text-sm text-fg-muted">Sign in to your account</p>
        </div>

        {error && <ErrorState title="Sign in failed" description={error} />}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="••••••••"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-sm text-fg-muted">
          Don&apos;t have an account?{' '}
          <button
            onClick={() => router.push('/signup')}
            className="text-accent hover:text-accent-hover"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  )
}
