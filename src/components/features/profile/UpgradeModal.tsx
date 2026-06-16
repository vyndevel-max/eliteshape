// src/components/features/profile/UpgradeModal.tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

const IconX = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IconCard = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
const IconPix = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7l10 10M17 7L7 17"/><rect x="3" y="3" width="18" height="18" rx="4"/></svg>
const IconCopy = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
const IconLoader = () => <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/></svg>
const IconCheck = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>

interface Props {
  onClose: () => void
  onPremiumActivated: () => void
}

type Mode = 'choose' | 'pix-qr'

export default function UpgradeModal({ onClose, onPremiumActivated }: Props) {
  const [mode, setMode] = useState<Mode>('choose')
  const [subscribingCard, setSubscribingCard] = useState(false)
  const [loadingPix, setLoadingPix] = useState(false)
  const [pixData, setPixData] = useState<{ qrCode?: string; qrCodeBase64?: string; ticketUrl?: string } | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const handleCardSubscribe = async () => {
    setSubscribingCard(true)
    try {
      const res = await fetch('/api/subscription/subscribe', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao iniciar assinatura')
      if (data.checkoutUrl) window.location.href = data.checkoutUrl
    } catch (e: any) {
      toast.error(e.message || 'Erro ao iniciar assinatura')
      setSubscribingCard(false)
    }
  }

  const handlePixGenerate = async () => {
    setLoadingPix(true)
    try {
      const res = await fetch('/api/subscription/pix', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar Pix')
      setPixData({ qrCode: data.qrCode, qrCodeBase64: data.qrCodeBase64, ticketUrl: data.ticketUrl })
      setMode('pix-qr')
      startPolling()
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar Pix')
    } finally {
      setLoadingPix(false)
    }
  }

  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase.from('profiles').select('is_premium').eq('id', user.id).single()
        if (profile?.is_premium) {
          if (pollRef.current) clearInterval(pollRef.current)
          toast.success('Pagamento confirmado! Premium ativado 🔥')
          onPremiumActivated()
          onClose()
        }
      } catch {}
    }, 4000)
  }

  const copyPixCode = () => {
    if (!pixData?.qrCode) return
    navigator.clipboard.writeText(pixData.qrCode)
    toast.success('Código Pix copiado!')
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="w-full sm:max-w-md bg-[#161616] border border-[#2A2A2A] rounded-t-3xl sm:rounded-3xl p-6 relative max-h-[90dvh] overflow-y-auto"
        >
          <button onClick={onClose} className="absolute top-5 right-5 text-[#555] hover:text-white transition-colors"><IconX /></button>

          <p className="forge-gradient-text text-[10px] font-bold uppercase tracking-widest mb-1">FORGE Premium</p>
          <h2 className="font-display text-2xl font-black text-white uppercase mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            {mode === 'choose' ? 'Escolha como pagar' : 'Pague com Pix'}
          </h2>

          {mode === 'choose' && (
            <>
              <p className="text-[#888] text-sm leading-relaxed mb-6">
                Diagnóstico Forge completo, fotos ilimitadas, Forge AI sem limites e check-ins semanais.
              </p>

              <div className="space-y-3">
                <button onClick={handleCardSubscribe} disabled={subscribingCard}
                  className="w-full text-left rounded-2xl bg-[#1B1B1B] border border-[#2A2A2A] hover:border-[#FF6A00]/40 p-4 transition-all disabled:opacity-50">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl forge-gradient-bg flex items-center justify-center text-white flex-shrink-0"><IconCard /></span>
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm">Cartão — Renovação automática</p>
                      <p className="text-[#666] text-xs mt-0.5">R$ 49,90/mês · cobrado automaticamente, cancele quando quiser</p>
                    </div>
                    {subscribingCard && <IconLoader />}
                  </div>
                </button>

                <button onClick={handlePixGenerate} disabled={loadingPix}
                  className="w-full text-left rounded-2xl bg-[#1B1B1B] border border-[#2A2A2A] hover:border-[#22C55E]/40 p-4 transition-all disabled:opacity-50">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E] flex-shrink-0"><IconPix /></span>
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm">Pix — Só este mês</p>
                      <p className="text-[#666] text-xs mt-0.5">R$ 49,90 · libera 30 dias, sem renovação automática</p>
                    </div>
                    {loadingPix && <IconLoader />}
                  </div>
                </button>
              </div>

              <p className="text-[#444] text-[11px] text-center mt-5">
                Pagamento processado de forma segura pelo Mercado Pago
              </p>
            </>
          )}

          {mode === 'pix-qr' && pixData && (
            <div className="space-y-4">
              <p className="text-[#888] text-sm">Escaneie o QR Code com o app do seu banco ou copie o código abaixo.</p>

              {pixData.qrCodeBase64 && (
                <div className="bg-white rounded-2xl p-4 flex items-center justify-center">
                  <img src={`data:image/png;base64,${pixData.qrCodeBase64}`} alt="QR Code Pix" className="w-48 h-48" />
                </div>
              )}

              {pixData.qrCode && (
                <button onClick={copyPixCode} className="w-full flex items-center justify-between gap-3 rounded-xl bg-[#1B1B1B] border border-[#2A2A2A] p-3.5 text-left hover:border-[#333] transition-all">
                  <span className="text-[#888] text-xs truncate flex-1">{pixData.qrCode.slice(0, 36)}...</span>
                  <span className="flex items-center gap-1.5 text-[#22C55E] text-xs font-bold flex-shrink-0"><IconCopy />Copiar</span>
                </button>
              )}

              <div className="flex items-center gap-2 justify-center text-[#666] text-xs">
                <IconLoader /> Aguardando confirmação do pagamento...
              </div>

              <button onClick={() => setMode('choose')} className="text-xs text-[#555] hover:text-[#999] transition-colors w-full text-center">
                ← Escolher outra forma de pagamento
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
