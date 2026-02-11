// ════════════════════════════════════════════════════════
// FILE PATH: src/app/layout.tsx
// WHERE: src/app/layout.tsx  (replaces existing)
// ════════════════════════════════════════════════════════
// suppressHydrationWarning on <html> fixes the hydration
// mismatch caused by browser extensions (e.g. MetaMask,
// Phantom) injecting style attributes server-side vs client.

import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SponsorPath — UK Visa Job Engine',
  description: 'Automated job search and applications for UK visa candidates. Sponsor-verified roles only.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}