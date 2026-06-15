// src/components/layout/InstallPrompt.tsx
'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const IconShare = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
  </svg>
)

const IconMore = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
  </svg>
)

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
)

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  )
}

function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /Android|iPhone|iPad|iPod/i.test(ua) || window.innerWidth < 1024
}

function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || '')
}

export default function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [ios, setIos] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    if (isStandalone()) return
    if (!isMobile()) return

    setIos(isIOS())
    setShow(true)

    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setShow(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShow(false)
  }

  if (!show) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full sm:max-w-sm bg-[#161616] border border-[#2A2A2A] rounded-3xl p-6 text-center"
        >
          <img src="/icons/forge-logo.png" alt="FORGE" className="w-16 h-16 object-contain mx-auto mb-4" />
          <h2 className="font-display text-2xl font-black text-white uppercase mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            Instale o FORGE
          </h2>
          <p className="forge-gradient-text text-xs font-bold uppercase tracking-widest mb-4">Forje sua Evolução</p>
          <p className="text-[#999] text-sm leading-relaxed mb-6">
            Para a melhor experiência, adicione o FORGE à tela inicial do seu celular. Funciona como um app de verdade — rápido, em tela cheia, sem barra de navegador.
          </p>

          {!ios && deferredPrompt && (
            <button onClick={handleInstall} className="btn btn-primary btn-lg w-full mb-3">
              Adicionar à tela inicial
            </button>
          )}

          {ios && (
            <div className="rounded-2xl bg-[#1B1B1B] border border-[#2A2A2A] p-4 mb-4 text-left space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#2A2A2A] flex items-center justify-center text-white text-xs font-bold">1</span>
                <p className="text-sm text-white">Toque no ícone de compartilhar <span className="inline-flex align-middle mx-1 text-[#4DA6FF]"><IconShare /></span> na barra do Safari</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#2A2A2A] flex items-center justify-center text-white text-xs font-bold">2</span>
                <p className="text-sm text-white">Toque em <span className="inline-flex items-center gap-1 font-semibold">"Adicionar à Tela de Início" <IconPlus /></span></p>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#2A2A2A] flex items-center justify-center text-white text-xs font-bold">3</span>
                <p className="text-sm text-white">Toque em <span className="font-semibold">"Adicionar"</span> no canto superior</p>
              </div>
            </div>
          )}

          {!ios && !deferredPrompt && (
            <div className="rounded-2xl bg-[#1B1B1B] border border-[#2A2A2A] p-4 mb-4 text-left space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#2A2A2A] flex items-center justify-center text-white text-xs font-bold">1</span>
                <p className="text-sm text-white">Toque no menu <span className="inline-flex align-middle mx-1 text-[#999]"><IconMore /></span> do navegador</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#2A2A2A] flex items-center justify-center text-white text-xs font-bold">2</span>
                <p className="text-sm text-white">Toque em <span className="font-semibold">"Adicionar à tela inicial"</span> ou <span className="font-semibold">"Instalar app"</span></p>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#2A2A2A] flex items-center justify-center text-white text-xs font-bold">3</span>
                <p className="text-sm text-white">Confirme tocando em <span className="font-semibold">"Adicionar"</span> ou <span className="font-semibold">"Instalar"</span></p>
              </div>
            </div>
          )}

          <button onClick={handleDismiss} className="text-xs text-[#666] hover:text-[#999] transition-colors">
            Já adicionei / Continuar pelo navegador
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
