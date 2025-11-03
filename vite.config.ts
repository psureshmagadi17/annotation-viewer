import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Explicitly configure JSX runtime
      jsxRuntime: 'automatic'
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  optimizeDeps: {
    include: ['pdfjs-dist', 'react', 'react-dom', 'react/jsx-runtime'],
    // Ensure Radix UI dependencies are also included
    exclude: [],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'pdfjs': ['pdfjs-dist'],
        },
      },
      // Remove the external array - it was counterproductive
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    // Ensure proper handling of JSX
    sourcemap: false, // Can help with build issues
  },
  server: {
    fs: {
      allow: ['..']
    }
  },
  // Ensure proper MIME type for worker files
  // assetsInclude: ['**/*.js'],
  // Configure headers for worker files
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
})