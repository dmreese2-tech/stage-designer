import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Replace 'stage-designer' below with your actual GitHub repo name
// e.g. if your repo is github.com/yourname/burgdorff-stage, use '/burgdorff-stage/'
export default defineConfig({
  plugins: [react()],
  base: '/stage-designer/',
})
