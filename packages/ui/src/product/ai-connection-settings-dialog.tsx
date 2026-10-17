import { useEffect, useState } from 'react'
import { cn } from '../utils/cn'
import { Button } from '../primitives/button'
import { Input } from '../primitives/input'
import { Label } from '../primitives/label'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../primitives/select'
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
import { Sparkles, Unplug, ShieldCheck, Zap, RefreshCw } from 'lucide-react'

export type AIProviderId =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'openrouter'
  | 'compatible'

export interface AIConnectionConfig {
  provider: AIProviderId
  model: string
  baseUrl: string
}

export interface AIConnectionHealth {
  healthy: boolean
  latencyMs?: number
  error?: string
}

export interface AIConnectionSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  savedConfig: AIConnectionConfig | null
  connected: boolean
  testing: boolean
  health: AIConnectionHealth | null
  enrichingCount: number
  models?: string[]
  loadingModels?: boolean
  modelsError?: string | null
  onLoadModels?: (config: AIConnectionConfig, apiKey: string) => void
  onTest: (config: AIConnectionConfig, apiKey: string) => void
  onConnect: (config: AIConnectionConfig, apiKey: string) => void
  onDisconnect: () => void
  className?: string
}

const DEFAULT_MODELS: Record<AIProviderId, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-5',
  gemini: 'gemini-2.0-flash',
  openrouter: 'openai/gpt-4o',
  compatible: '',
}

export function AIConnectionSettingsDialog({
  open,
  onOpenChange,
  savedConfig,
  connected,
  testing,
  health,
  enrichingCount,
  models,
  loadingModels,
  modelsError,
  onLoadModels,
  onTest,
  onConnect,
  onDisconnect,
  className,
}: AIConnectionSettingsDialogProps) {
  const [provider, setProvider] = useState<AIProviderId>(
    savedConfig?.provider ?? 'openai',
  )
  const [model, setModel] = useState(savedConfig?.model ?? DEFAULT_MODELS.openai)
  const [baseUrl, setBaseUrl] = useState(savedConfig?.baseUrl ?? '')
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    if (open) {
      setProvider(savedConfig?.provider ?? 'openai')
      setModel(savedConfig?.model ?? DEFAULT_MODELS.openai)
      setBaseUrl(savedConfig?.baseUrl ?? '')
      setApiKey('')
    }
  }, [open, savedConfig])

  function handleProviderChange(next: AIProviderId) {
    setProvider(next)
    setModel(DEFAULT_MODELS[next])
    setBaseUrl('')
  }

  const config: AIConnectionConfig = { provider, model, baseUrl }
  const canSubmit = apiKey.trim().length > 0 && model.trim().length > 0
  const showBaseUrl = provider === 'compatible' || provider === 'openrouter'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-md', className)}>
        <DialogHeader>
          <DialogTitle>AI provider</DialogTitle>
          <DialogDescription>
            Bring your own key. Entries are enriched in the background — AI is
            never on the save path, and prompts go directly from this app to
            your provider.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {connected ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-md border border-border-default bg-bg-surface px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-fg-primary">
                    {savedConfig?.provider} · {savedConfig?.model}
                  </p>
                  <p className="text-xs text-fg-muted">
                    {enrichingCount > 0
                      ? `Enriching ${enrichingCount} entr${enrichingCount === 1 ? 'y' : 'ies'}…`
                      : 'Idle'}
                  </p>
                </div>
                <Badge variant="success">Connected</Badge>
              </div>
              <p className="flex items-start gap-2 text-xs text-fg-muted">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Your API key is kept in memory for this session only and is
                never written to disk or sent to us.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select value={provider} onValueChange={(v) => handleProviderChange(v as AIProviderId)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                    <SelectItem value="compatible">
                      Custom — LiteLLM / Ollama / vLLM
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ai-model">Model</Label>
                  {onLoadModels && (provider === 'compatible' || provider === 'openrouter') && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      disabled={testing || loadingModels || apiKey.trim().length === 0}
                      onClick={() => onLoadModels(config, apiKey.trim())}
                    >
                      <RefreshCw
                        className={cn('h-3 w-3', loadingModels && 'animate-spin')}
                      />
                      {loadingModels ? 'Loading…' : 'Load models'}
                    </Button>
                  )}
                </div>
                <Input
                  id="ai-model"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={DEFAULT_MODELS[provider] || 'model-name'}
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
                {models && models.length > 0 && (
                  <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                    {models.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-xs transition-colors',
                          m === model
                            ? 'border-border-strong bg-bg-active text-fg-primary'
                            : 'border-border-default text-fg-muted hover:bg-bg-hover',
                        )}
                        onClick={() => setModel(m)}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
                {modelsError && (
                  <p className="text-xs text-danger" role="alert">
                    {modelsError}
                  </p>
                )}
              </div>
              {showBaseUrl && (
                <div className="space-y-2">
                  <Label htmlFor="ai-base-url">Base URL</Label>
                  <Input
                    id="ai-base-url"
                    type="url"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="http://localhost:8000 (LiteLLM / Ollama)"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="ai-api-key">API key</Label>
                <Input
                  id="ai-api-key"
                  type="password"
                  autoComplete="off"
                  placeholder="Paste your API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              {health && (
                <p
                  className={cn(
                    'text-xs',
                    health.healthy ? 'text-fg-muted' : 'text-danger',
                  )}
                  role="status"
                  aria-live="polite"
                >
                  {health.healthy
                    ? `Connection OK (${health.latencyMs ?? 0}ms)`
                    : health.error || 'Connection failed'}
                </p>
              )}
              <p className="flex items-start gap-2 text-xs text-fg-muted">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Your API key is kept in memory for this session only and is
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
            <>
              <Button
                variant="ghost"
                disabled={!canSubmit || testing}
                onClick={() => onTest(config, apiKey.trim())}
              >
                <Zap className="h-3.5 w-3.5" />
                {testing ? 'Testing…' : 'Test'}
              </Button>
              <Button
                disabled={!canSubmit}
                onClick={() => onConnect(config, apiKey.trim())}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Connect
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
