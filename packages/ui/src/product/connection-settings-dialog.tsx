import { useEffect, useMemo, useState } from 'react'
import { cn } from '../utils/cn'
import { Button } from '../primitives/button'
import { Input } from '../primitives/input'
import { Label } from '../primitives/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../primitives/dialog'
import { Badge } from '../primitives/badge'
import { Database, Unplug, ShieldCheck, CloudUpload, Copy } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '../primitives/radio'

export type DataConnectionType = 'turso' | 'supabase'

export interface ConnectionSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  savedUrl: string | null
  savedType?: DataConnectionType
  connected: boolean
  connecting: boolean
  error: string | null
  pendingCount: number
  onConnect: (url: string, token: string, type: DataConnectionType) => void
  onDisconnect: () => void
  supabaseSetupSql?: string
  backfilling?: boolean
  backfillResult?: string | null
  backfillError?: string | null
  onBackfill?: () => void
  /** Restrict selectable engines (web is Supabase-only) */
  allowedTypes?: DataConnectionType[]
  className?: string
}

const TYPE_LABELS: Record<DataConnectionType, string> = {
  supabase: 'Supabase',
  turso: 'Turso / libSQL',
}

const TYPE_PLACEHOLDERS: Record<
  DataConnectionType,
  { url: string; token: string }
> = {
  supabase: {
    url: 'https://your-project.supabase.co',
    token: 'anon or service_role key (leave empty if public)',
  },
  turso: {
    url: 'libsql://your-db.turso.io or http://localhost:8080',
    token: 'Leave empty for local servers without auth',
  },
}

export function ConnectionSettingsDialog({
  open,
  onOpenChange,
  savedUrl,
  savedType = 'turso',
  connected,
  connecting,
  error,
  pendingCount,
  onConnect,
  onDisconnect,
  supabaseSetupSql,
  backfilling,
  backfillResult,
  backfillError,
  onBackfill,
  allowedTypes,
  className,
}: ConnectionSettingsDialogProps) {
  const [url, setUrl] = useState(savedUrl ?? '')
  const [token, setToken] = useState('')
  const [type, setType] = useState<DataConnectionType>(savedType)
  const [sqlCopied, setSqlCopied] = useState(false)

  const selectable = useMemo<DataConnectionType[]>(
    () => allowedTypes ?? ['supabase', 'turso'],
    [allowedTypes],
  )

  useEffect(() => {
    if (open) {
      setUrl(savedUrl ?? '')
      setType(selectable.includes(savedType) ? savedType : selectable[0]!)
      setToken('')
      setSqlCopied(false)
    }
  }, [open, savedUrl, savedType, selectable])

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-md', className)}>
        <DialogHeader>
          <DialogTitle>Database connection</DialogTitle>
          <DialogDescription>
            Sync your work entries to your own database. Your data never
            touches our servers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {connected ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-md border border-border-default bg-bg-surface px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-fg-primary">{savedUrl}</p>
                  <p className="text-xs text-fg-muted">
                    {TYPE_LABELS[savedType]} ·{' '}
                    {pendingCount > 0
                      ? `${pendingCount} entr${pendingCount === 1 ? 'y' : 'ies'} pending sync`
                      : 'All entries synced'}
                  </p>
                </div>
                <Badge variant="success">Connected</Badge>
              </div>
              {backfillError && (
                <p className="text-xs text-danger" role="alert">
                  {backfillError}
                </p>
              )}
              {backfillResult && (
                <p className="text-xs text-success">{backfillResult}</p>
              )}
              {onBackfill && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={backfilling}
                  onClick={onBackfill}
                  className="w-full"
                >
                  <CloudUpload className="h-3.5 w-3.5" />
                  {backfilling
                    ? 'Copying local data…'
                    : 'Move local data to cloud'}
                </Button>
              )}
              <p className="flex items-start gap-2 text-xs text-fg-muted">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Your auth token is kept in memory for this session only and is
                never written to disk.
              </p>
            </div>
          ) : (
            <>
              {selectable.length > 1 && (
                <div className="space-y-2">
                  <Label>Database type</Label>
                  <RadioGroup
                    value={type}
                    onValueChange={(v: string) =>
                      setType(v as DataConnectionType)
                    }
                    className="flex gap-4"
                  >
                    {selectable.includes('supabase') && (
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="supabase" id="db-type-supabase" />
                        <Label htmlFor="db-type-supabase">Supabase</Label>
                      </div>
                    )}
                    {selectable.includes('turso') && (
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="turso" id="db-type-turso" />
                        <Label htmlFor="db-type-turso">Turso / libSQL</Label>
                      </div>
                    )}
                  </RadioGroup>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="connection-url">
                  {type === 'supabase' ? 'Project URL' : 'Database URL'}
                </Label>
                <Input
                  id="connection-url"
                  type="url"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={TYPE_PLACEHOLDERS[type].url}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={connecting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="connection-token">
                  {type === 'supabase' ? 'API key' : 'Auth token (optional)'}
                </Label>
                <Input
                  id="connection-token"
                  type="password"
                  autoComplete="off"
                  placeholder={TYPE_PLACEHOLDERS[type].token}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={connecting}
                />
              </div>
              {type === 'supabase' && supabaseSetupSql && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void copySql()}
                  type="button"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {sqlCopied ? 'Copied!' : 'Copy setup SQL (run once)'}
                </Button>
              )}
              {savedUrl && (
                <p className="text-xs text-fg-muted">
                  Reconnecting to {savedUrl}? Enter your token again — it is
                  never stored.
                </p>
              )}
              {error && (
                <p
                  className="text-xs text-danger"
                  role="alert"
                  aria-live="polite"
                >
                  {error}
                </p>
              )}
              <p className="flex items-start gap-2 text-xs text-fg-muted">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Your auth token is kept in memory for this session only and is
                never written to disk or sent to us.
              </p>
            </>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Close</Button>
          </DialogClose>
          {connected ? (
            <Button variant="secondary" onClick={onDisconnect}>
              <Unplug className="h-3.5 w-3.5" />
              Disconnect
            </Button>
          ) : (
            <Button
              disabled={!canConnect}
              onClick={() => onConnect(url.trim(), token.trim(), type)}
            >
              <Database className="h-3.5 w-3.5" />
              {connecting ? 'Connecting…' : 'Connect'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
