import { useState } from 'react'
import { cn } from '../utils/cn'
import { Button } from '../primitives/button'
import { Input } from '../primitives/input'
import { Label } from '../primitives/label'
import { Logo } from './logo'
import { Database, Copy, ShieldCheck } from 'lucide-react'

export interface DatabaseGateProps {
  onConnect: (url: string, apiKey: string) => void
  connecting: boolean
  error: string | null
  supabaseSetupSql?: string
  email?: string
  className?: string
}

export function DatabaseGate({
  onConnect,
  connecting,
  error,
  supabaseSetupSql,
  email,
  className,
}: DatabaseGateProps) {
  const [url, setUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [sqlCopied, setSqlCopied] = useState(false)

  const canConnect = url.trim().length > 0 && !connecting

  const copySql = async () => {
    if (!supabaseSetupSql) return
    try {
      await navigator.clipboard.writeText(supabaseSetupSql)
      setSqlCopied(true)
      setTimeout(() => setSqlCopied(false), 2000)
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <div
      className={cn(
        'flex min-h-screen items-center justify-center bg-bg-canvas px-4 py-10',
        className,
      )}
    >
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo size={56} />
          <div>
            <h1 className="text-xl font-semibold text-fg-primary">
              Connect your database
            </h1>
            <p className="mt-1 text-sm text-fg-muted">
              Your work entries sync to your own Supabase project. We never
              read your data.
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-border-default bg-bg-surface p-6 shadow-sm">
          {email && (
            <p className="text-xs text-fg-muted">
              Signed in as <span className="text-fg-primary">{email}</span>
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="gate-url">Supabase project URL</Label>
            <Input
              id="gate-url"
              type="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://your-project.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={connecting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gate-key">API key</Label>
            <Input
              id="gate-key"
              type="password"
              autoComplete="off"
              placeholder="anon or service_role key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={connecting}
            />
          </div>
          {supabaseSetupSql && (
            <Button
              size="sm"
              variant="secondary"
              type="button"
              onClick={() => void copySql()}
              className="w-full"
            >
              <Copy className="h-3.5 w-3.5" />
              {sqlCopied
                ? 'Copied! Paste it in Supabase SQL Editor and run'
                : 'Copy setup SQL (run once in Supabase)'}
            </Button>
          )}
          {error && (
            <p className="text-xs text-danger" role="alert" aria-live="polite">
              {error}
            </p>
          )}
          <Button
            className="w-full"
            disabled={!canConnect}
            onClick={() => onConnect(url.trim(), apiKey.trim())}
          >
            <Database className="h-3.5 w-3.5" />
            {connecting ? 'Connecting…' : 'Connect database'}
          </Button>
          <p className="flex items-start gap-2 text-xs text-fg-muted">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Your key is encrypted with AES-256-GCM before storage and is only
            decrypted to sync your devices.
          </p>
        </div>
      </div>
    </div>
  )
}
