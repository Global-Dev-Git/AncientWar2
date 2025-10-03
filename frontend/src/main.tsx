import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SettingsProvider } from './contexts/SettingsContext'
import { TranslationProvider } from './contexts/TranslationContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <TranslationProvider>
        <App />
      </TranslationProvider>
    </SettingsProvider>
  </StrictMode>,
)
