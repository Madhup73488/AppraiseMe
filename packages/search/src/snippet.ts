export function snippetFor(
  content: string,
  query: string,
  maxLen = 120,
): string {
  const queryTerms = Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 1),
    ),
  )

  const lower = content.toLowerCase()
  let bestPos = 0
  for (const term of queryTerms) {
    const pos = lower.indexOf(term)
    if (pos >= 0) {
      bestPos = pos
      break
    }
  }

  const start = Math.max(0, bestPos - Math.floor(maxLen / 4))
  let snippet = content.slice(start, start + maxLen)

  if (start > 0) snippet = '…' + snippet
  if (start + maxLen < content.length) snippet = snippet + '…'

  return snippet
}
