import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // Allow serving files from the project root so the sandbox can
      // import tutorial files that live outside the sandbox directory.
      allow: ['..'],
    },
  },
});
