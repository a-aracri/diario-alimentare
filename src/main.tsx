import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { SelectedDateProvider } from '@/hooks/selected-date'
import { registerServiceWorker } from '@/lib/pwa'
import App from './App.tsx'
import './index.css'

registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SelectedDateProvider>
        <App />
        <Toaster
          position="top-center"
          richColors={false}
          mobileOffset={{ top: 'calc(env(safe-area-inset-top) + 8px)' }}
        />
      </SelectedDateProvider>
    </ThemeProvider>
  </StrictMode>,
)
