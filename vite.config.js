import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const projectId = env.VITE_FIREBASE_PROJECT_ID || ''
  const timelapseTarget = projectId
    ? `https://us-central1-${projectId}.cloudfunctions.net`
    : ''

  return {
    plugins: [react()],
    envDir: resolve(__dirname),
    server: {
      proxy: {
        '/api/chart': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        ...(timelapseTarget
          ? {
              '/api/timelapse-chat': {
                target: timelapseTarget,
                changeOrigin: true,
                secure: true,
                rewrite: () => '/timeLapseChatHttp',
              },
            }
          : {}),
      },
    },
  }
})
