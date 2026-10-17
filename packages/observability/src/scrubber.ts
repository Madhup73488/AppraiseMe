const scrubPatterns = [
  /api[_-]?key[s]?["'\s]*[:=]["'\s]*[a-zA-Z0-9_\-]{20,}/gi,
  /bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi,
  /postgres(ql)?:\/\/[^\s"']+/gi,
  /mysql:\/\/[^\s"']+/gi,
  /sqlite:\/\/[^\s"']+/gi,
  /libsql:\/\/[^\s"']+/gi,
  /mongodb(\+srv)?:\/\/[^\s"']+/gi,
  /sk-[a-zA-Z0-9]{20,}/gi,
  /pk_[a-zA-Z0-9]{20,}/gi,
  /claude-[a-zA-Z0-9]{20,}/gi,
  /eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]*/g,
  /password["'\s]*[:=]["'\s]*[^\s"']+/gi,
  /secret["'\s]*[:=]["'\s]*[a-zA-Z0-9_\-]{16,}/gi,
  /token["'\s]*[:=]["'\s]*[a-zA-Z0-9_\-]{16,}/gi,
  /connection[_-]?string["'\s]*[:=]["'\s]*[^\s"']+/gi,
  /dsn["'\s]*[:=]["'\s]*https?:\/\/[^\s"']+/gi,
]

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

const SENSITIVE_PARAM_TOKENS = [
  'password',
  'passwd',
  'secret',
  'token',
  'key',
  'auth',
  'credential',
  'dsn',
  'connection',
  'apikey',
  'apikey',
  'access_token',
  'refresh_token',
  'bearertoken',
]

function scrubSensitiveParams(str: string): string {
  let result = str
  for (const token of SENSITIVE_PARAM_TOKENS) {
    const regex = new RegExp(
      `(${token}["'\\s]*[:=]["'\\s]*)([^\\s"',\\]]+)`,
      'gi',
    )
    result = result.replace(regex, (match, prefix, value) => {
      if (value.length <= 4) return match
      return `${prefix}[REDACTED]`
    })
  }
  return result
}

function isLikelyEmail(str: string): boolean {
  EMAIL_PATTERN.lastIndex = 0
  return EMAIL_PATTERN.test(str)
}

export interface ScrubOptions {
  allowAppVersion?: boolean
  allowAdapterType?: boolean
  allowLatencyBucket?: boolean
  allowErrorCategory?: boolean
  allowErrorMessage?: boolean
}

const DEFAULT_OPTIONS: ScrubOptions = {
  allowAppVersion: true,
  allowAdapterType: true,
  allowLatencyBucket: true,
  allowErrorCategory: true,
  allowErrorMessage: false,
}

export function scrubPatternsInString(input: string): string {
  let result = input

  result = scrubSensitiveParams(result)

  for (const pattern of scrubPatterns) {
    result = result.replace(pattern, '[REDACTED]')
  }

  result = result.replace(EMAIL_PATTERN, (match) =>
    isLikelyEmail(match) ? '[EMAIL]' : match,
  )

  result = result.replace(UUID_PATTERN, '[UUID]')

  return result
}

export function scrubString(input: string, options?: ScrubOptions): string {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  if (!opts.allowErrorMessage) {
    const stripped = scrubPatternsInString(input)
    if (stripped !== input) return stripped
    return '[MESSAGE SCRUBBED]'
  }

  return scrubPatternsInString(input).trim().slice(0, 200)
}

export function scrubErrorMessage(message: string): string {
  return scrubPatternsInString(message).trim().slice(0, 200)
}

export function scrubValue(value: unknown): unknown {
  if (typeof value === 'string') return scrubPatternsInString(value)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) return value.map((v) => scrubValue(v))
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const scrubbed: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(record)) {
      scrubbed[key] = scrubValue(val)
    }
    return scrubbed
  }
  return '[UNSCRUBBABLE]'
}

export function hashId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return `h_${Math.abs(hash).toString(36)}`
}
