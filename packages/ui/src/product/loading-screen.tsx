import { useEffect, useRef, useState } from 'react'
import { cn } from '../utils/cn'
import { Logo } from './logo'

export interface LoadingScreenProps {
  /** Real boot progress (0-100); the displayed value eases toward it */
  progress: number
  label?: string
  /** When true, the bar completes to 100% and onDone fires shortly after */
  done?: boolean
  onDone?: () => void
  className?: string
}

export function LoadingScreen({
  progress,
  label,
  done = false,
  onDone,
  className,
}: LoadingScreenProps) {
  const clamped = Math.max(0, Math.min(100, progress))
  const [display, setDisplay] = useState(0)
  const displayRef = useRef(0)
  const doneFiredRef = useRef(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    const target = done ? 100 : clamped
    if (displayRef.current >= target) {
      if (done && !doneFiredRef.current) {
        displayRef.current = 100
        setDisplay(100)
        doneFiredRef.current = true
        setTimeout(() => onDoneRef.current?.(), 350)
      }
      return
    }
    const timer = setInterval(() => {
      const diff = target - displayRef.current
      const step = Math.max(0.6, diff * 0.09)
      displayRef.current = Math.min(target, displayRef.current + step)
      setDisplay(displayRef.current)
    }, 24)
    return () => clearInterval(timer)
  }, [clamped, done, display])

  const pct = Math.round(display)

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-bg-canvas px-6',
        className,
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="animate-pulse">
          <Logo size={56} />
        </div>
        <p className="text-lg font-semibold tracking-tight text-fg-primary">
          AppraiseMe
        </p>
      </div>
      <div className="flex w-64 flex-col items-center gap-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-hover">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent via-accent to-accent/60 transition-[width] duration-100 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex w-full items-center justify-between text-[11px] tabular-nums text-fg-muted">
          <span>{label ?? 'Loading…'}</span>
          <span className="font-medium text-fg-secondary">{pct}%</span>
        </div>
      </div>
    </div>
  )
}
