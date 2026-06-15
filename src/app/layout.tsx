// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'EliteShape AI — Treinamento & Nutrição de Elite',
  description: 'Plataforma de preparação física de alto nível com Inteligência Artificial. Análise de shape, treinos personalizados e nutrição de precisão.',
  keywords: 'treino, nutrição, shape, bodybuilding, IA, inteligência artificial, personal',
  openGraph: {
    title: 'EliteShape AI',
    description: 'Transform your physique with elite AI coaching',
    type: 'website',
  },
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
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1A1A1A',
              color: '#E8E8E8',
              border: '1px solid #252525',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#E8002D', secondary: '#fff' } },
            error: { iconTheme: { primary: '#E8002D', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  )
}
