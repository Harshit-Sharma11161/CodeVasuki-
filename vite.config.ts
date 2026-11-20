import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import sourceLoc from './tools/vite-plugin-source-loc.mjs'
import path from 'path'

export default defineConfig({
  plugins: [sourceLoc(), react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  }
})