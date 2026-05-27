import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./testing-setup.ts'],
    include: ['phase-10-testing/**/*.test.tsx', 'phase-10-testing/**/*.test.ts'],
  },
})
