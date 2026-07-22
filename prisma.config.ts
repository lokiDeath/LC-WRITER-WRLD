// Prisma configuration file (replaces the deprecated package.json#prisma field)
// See: https://pris.ly/d/prisma-config

import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  // Use the modern seed command (run with: prisma db seed)
  migrations: {
    path: path.join('prisma', 'migrations'),
  },
})
