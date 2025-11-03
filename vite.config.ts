import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Add this to ensure React is deduplicated
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['pdfjs-dist', 'react', 'react-dom', 'react/jsx-runtime'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'pdfjs': ['pdfjs-dist'],
        },
      },
      // Add this to handle the jsx-runtime issue
      external: [],
    },
    // Add this to ensure compatibility
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
  server: {
    fs: {
      allow: ['..']
    }
  },
  // Ensure proper MIME type for worker files
  assetsInclude: ['**/*.js'],
  // Configure headers for worker files
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
})