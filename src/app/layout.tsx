// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import InstallPrompt from '@/components/layout/InstallPrompt'

export const metadata: Metadata = {
  title: 'FORGE — Forje sua Evolução',
  description: 'Plataforma de evolução pessoal guiada por inteligência artificial. Diagnóstico corporal, treino, nutrição e Forge AI em um só lugar.',
  keywords: 'forge, evolução, treino, nutrição, IA, inteligência artificial, performance, transformação',
  manifest: '/manifest.json',
  icons: {
    icon: ['/icons/favicon-32.png', '/icons/favicon-16.png'],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FORGE',
  },
  openGraph: {
    title: 'FORGE',
    description: 'Forje sua evolução com inteligência artificial',
    type: 'website',
  },
}

export const viewport = {
  themeColor: '#0B0B0B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
        <InstallPrompt />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1B1B1B',
              color: '#E8E8E8',
              border: '1px solid #2A2A2A',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#FF3B30', secondary: '#fff' } },
            error: { iconTheme: { primary: '#FF3B30', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  )
}
