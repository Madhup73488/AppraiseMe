'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/')
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-canvas">
      <p className="text-sm text-fg-muted">Redirecting...</p>
    </div>
  )
}
