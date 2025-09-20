import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'], 
  },
  test: {
    environment: 'jsdom',         
    setupFiles: ['./vitest.setup.js'], 
    globals: true,
  },
})