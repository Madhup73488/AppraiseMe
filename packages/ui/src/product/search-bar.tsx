import { useState, useCallback } from 'react'
import { cn } from '../utils/cn'
import { Input } from '../primitives/input'
import { Search, X } from 'lucide-react'

export interface SearchBarProps {
  onSearch: (query: string) => void
  placeholder?: string
  className?: string
  debounceMs?: number
}

export function SearchBar({
  onSearch,
  placeholder = 'Search work entries...',
  className,
  debounceMs = 200,
}: SearchBarProps) {
  const [value, setValue] = useState('')
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const debouncedSearch = useCallback(
    (query: string) => {
      if (timer) clearTimeout(timer)
      const t = setTimeout(() => onSearch(query), debounceMs)
      setTimer(t)
    },
    [onSearch, debounceMs, timer],
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    debouncedSearch(newValue)
  }

  const handleClear = () => {
    setValue('')
    onSearch('')
  }

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-muted" />
      <Input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="pl-8 pr-8"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg-primary"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
