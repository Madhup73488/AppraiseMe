const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'no',
  'not',
  'of',
  'on',
  'or',
  'such',
  'that',
  'the',
  'their',
  'then',
  'there',
  'these',
  'they',
  'this',
  'to',
  'was',
  'will',
  'with',
])

export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function tokenize(input: string): string[] {
  const normalized = normalizeText(input)
  const raw = normalized.split(/[^a-z0-9]+/).filter(Boolean)
  const tokens: string[] = []
  for (const token of raw) {
    if (STOP_WORDS.has(token)) continue
    tokens.push(stemToken(token))
  }
  return tokens
}

export function stemToken(token: string): string {
  if (token.length <= 3) return token
  if (token.endsWith('ies') && token.length > 4) {
    return token.slice(0, -3) + 'y'
  }
  if (token.endsWith('ses') && token.length > 4) {
    return token.slice(0, -2)
  }
  if (token.endsWith('s') && !token.endsWith('ss') && token.length > 3) {
    return stripDoubleConsonant(token.slice(0, -1))
  }
  if (token.endsWith('ied') && token.length > 4) {
    return token.slice(0, -3) + 'y'
  }
  if (token.endsWith('eed') && token.length > 4) {
    return token.slice(0, -1)
  }
  if (token.endsWith('ed') && token.length > 4) {
    return stripDoubleConsonant(token.slice(0, -2))
  }
  if (token.endsWith('ing') && token.length > 5) {
    return stripDoubleConsonant(token.slice(0, -3))
  }
  return token
}

function stripDoubleConsonant(token: string): string {
  if (token.length < 3) return token
  const last = token.charAt(token.length - 1)
  const secondToLast = token.charAt(token.length - 2)
  if (
    last === secondToLast &&
    !isVowel(last) &&
    isVowel(token.charAt(token.length - 3))
  ) {
    return token.slice(0, -1)
  }
  return token
}

function isVowel(char: string): boolean {
  return 'aeiou'.includes(char)
}

export function extractPhrase(input: string): string {
  return normalizeText(input).trim()
}
