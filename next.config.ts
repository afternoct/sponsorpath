// ════════════════════════════════════════════════════════════════
// FILE:  next.config.ts
// WHERE: Project ROOT (same folder as package.json)
// REPLACES your existing next.config.ts
// ════════════════════════════════════════════════════════════════
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
}

export default nextConfig