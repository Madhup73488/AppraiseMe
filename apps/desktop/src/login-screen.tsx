import { useState } from 'react'
import { useAuth } from './auth-context'
import { Button, Input, Label, ErrorState, Logo } from '@appraiseme/ui'
import { BRAND } from '@appraiseme/config'
import { AppError } from '@appraiseme/domain'

export function LoginScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
      } else {
        const result = await signUp(email, password, displayName || undefined)
        if (result.needsConfirmation) {
          setError('Check your email to confirm your account, then sign in.')
        }
      }
    } catch (err) {
      setError(
        err instanceof AppError
          ? err.message
          : 'Something went wrong. Try again.',
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
          <p className="mt-1 text-sm text-fg-muted">
            {mode === 'signin'
              ? 'Sign in to your account'
              : 'Create your account'}
          </p>
        </div>

        {error && <ErrorState title="Couldn't continue" description={error} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <Label htmlFor="display-name">Name</Label>
              <Input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                autoFocus
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus={mode === 'signin'}
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
            {loading
              ? 'Please wait...'
              : mode === 'signin'
                ? 'Sign in'
                : 'Sign up'}
          </Button>
        </form>

        <p className="text-center text-sm text-fg-muted">
          {mode === 'signin' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                onClick={() => setMode('signup')}
                className="text-accent hover:text-accent-hover"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already registered?{' '}
              <button
                onClick={() => setMode('signin')}
                className="text-accent hover:text-accent-hover"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
