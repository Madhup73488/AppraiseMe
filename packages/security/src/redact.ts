export function redactUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (!parsed.username && !parsed.password) {
      return parsed.toString()
    }
    const auth = '[REDACTED]:[REDACTED]@'
    return `${parsed.protocol}//${auth}${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return '[INVALID_URL]'
  }
}

export function truncateForDisplay(value: string, maxLen: number = 12): string {
  if (value.length <= maxLen) return value
  return value.slice(0, 4) + '••••' + value.slice(-4)
}
