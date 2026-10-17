export async function contentHash(content: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.abs(hash).toString(16)
}

export function isIdempotent(
  storedHash: string | null,
  content: string,
): Promise<boolean> {
  if (!storedHash) return Promise.resolve(false)
  return contentHash(content).then((h) => h === storedHash)
}
