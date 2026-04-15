import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Chronicler',
  description: 'Multi-agent novel writing system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
