import type { NextConfig } from 'next'
import { fileURLToPath } from 'node:url'

const config: NextConfig = {
  output: 'standalone',
  transpilePackages: [
    '@appraiseme/ui',
    '@appraiseme/themes',
    '@appraiseme/config',
  ],
  outputFileTracingRoot: fileURLToPath(new URL('../..', import.meta.url)),
}

export default config
