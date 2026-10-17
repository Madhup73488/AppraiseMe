import { useEffect, useState } from 'react'

export interface TypewriterTextProps {
  text: string
  /** total duration in ms for the full text to appear */
  duration?: number
  className?: string
}

export function TypewriterText({
  text,
  duration = 1500,
  className,
}: TypewriterTextProps) {
  const [count, setCount] = useState(text.length === 0 ? 0 : 1)
  const done = count >= text.length

  useEffect(() => {
    if (text.length === 0) return
    setCount(1)
    const ticks = 50
    const step = Math.max(1, Math.ceil(text.length / ticks))
    const interval = Math.max(12, Math.floor(duration / ticks))
    let n = 1
    const timer = setInterval(() => {
      n = Math.min(text.length, n + step)
      setCount(n)
      if (n >= text.length) clearInterval(timer)
    }, interval)
    return () => clearInterval(timer)
  }, [text, duration])

  return (
    <span className={className}>
      {text.slice(0, done ? text.length : count)}
      {!done && (
        <span aria-hidden className="animate-pulse text-accent">
          ▍
        </span>
      )}
    </span>
  )
}
