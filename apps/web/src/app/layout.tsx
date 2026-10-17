import type { Metadata } from 'next'
import { BRAND } from '@appraiseme/config'
import { AuthProvider } from '@/lib/auth-context'
import './globals.css'

export const metadata: Metadata = {
  title: BRAND.name,
  description: BRAND.description,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" data-theme="appraiseme">
      <body className="bg-bg-canvas text-fg-primary antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
