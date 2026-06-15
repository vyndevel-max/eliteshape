// src/components/features/voice/ForgeVoiceAssistant.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import type { Profile } from '@/types/supabase'
import toast from 'react-hot-toast'

const IconMic = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
)

const IconX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
)

const IconSend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
)

const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
)

function getSpeechRecognition(): any {
  if (typeof window === 'undefined') return null
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null
}

const TAB_LABELS: Record<string, string> = {
  dashboard: 'Hoje',
  coach: 'Diagnóstico Forge',
  chat: 'Forge AI',
  training: 'Treino',
  nutrition: 'Nutrição',
  profile: 'Perfil',
}

type Status = 'idle' | 'listening' | 'processing' | 'result'

interface ForgeVoiceAssistantProps {
  profile: Profile
}

export default function ForgeVoiceAssistant({ profile }: ForgeVoiceAssistantProps) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [transcript, setTranscript] = useState('')
  const [textInput, setTextInput] = useState('')
  const [reply, setReply] = useState('')
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef<any>(null)
  const { setActiveTab, addChatMessage } = useAppStore()
  const supabase = createClient()

  useEffect(() => {
    setSupported(!!getSpeechRecognition())
  }, [])

  const reset = () => {
    setStatus('idle')
    setTranscript('')
    setTextInput('')
    setReply('')
  }

  const closeModal = () => {
    recognitionRef.current?.stop()
    setOpen(false)
    setTimeout(reset, 250)
  }

  const startListening = () => {
    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition) { setSupported(false); return }

    const recognition = new SpeechRecognition()
    recognition.lang = 'pt-BR'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    let finalTranscript = ''

    recognition.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) finalTranscript += t
        else interim += t
      }
      setTranscript(finalTranscript + interim)
    }

    recognition.onerror = () => {
      setStatus('idle')
    }

    recognition.onend = () => {
      if (finalTranscript.trim()) {
        setTranscript(finalTranscript.trim())
        handleSubmit(finalTranscript.trim())
      } else {
        setStatus('idle')
      }
    }

    recognitionRef.current = recognition
    setStatus('listening')
    setTranscript('')
    recognition.start()
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
  }

  const speak = (text: string) => {
    try {
      if (!('speechSynthesis' in window)) return
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'pt-BR'
      utterance.rate = 1.02
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utterance)
    } catch {
      // non-critical
    }
  }

  const registerMeal = async (mealText: string) => {
    try {
      const res = await fetch('/api/ai/meal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: mealText, language: profile.language || 'pt' }),
      })
      const data = await res.json()
      await supabase.from('meals').insert({
        user_id: profile.id, name: data.name || mealText,
        calories: data.calories || 0, protein: data.protein || 0,
        carbs: data.carbs || 0, fat: data.fat || 0, meal_type: 'other',
        logged_at: new Date().toISOString(),
      } as any)
      return data.name || mealText
    } catch {
      return null
    }
  }

  const handleSubmit = async (text: string) => {
    if (!text.trim()) { setStatus('idle'); return }
    setStatus('processing')
    try {
      const res = await fetch('/api/ai/voice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, profile }),
      })
      const data = await res.json()

      if (data.intent === 'log_meal' && data.mealText) {
        const mealName = await registerMeal(data.mealText)
        const finalReply = mealName ? `Registrado: ${mealName}. ${data.reply}` : data.reply
        setReply(finalReply)
        setStatus('result')
        speak(finalReply)
        toast.success(mealName ? `${mealName} registrado!` : 'Refeição registrada!')
      } else if (data.intent === 'navigate' && data.target && TAB_LABELS[data.target]) {
        setReply(data.reply)
        setStatus('result')
        speak(data.reply)
        setTimeout(() => {
          setActiveTab(data.target)
          closeModal()
        }, 1100)
      } else {
        setReply(data.reply)
        setStatus('result')
        speak(data.reply)
        addChatMessage({ role: 'user', content: text })
        addChatMessage({ role: 'assistant', content: data.reply })
      }
    } catch {
      setReply('Não consegui processar agora. Tenta de novo?')
      setStatus('result')
      toast.error('Erro ao processar comando')
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={() => setOpen(true)}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-40 w-14 h-14 rounded-full forge-gradient-bg flex items-center justify-center text-white shadow-lg"
        style={{ boxShadow: '0 4px 24px -4px rgba(255,59,48,0.5)' }}
        title="Falar com a Forge AI"
      >
        <IconMic size={24} />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
              className="w-full sm:max-w-md bg-[#161616] border border-[#2A2A2A] rounded-t-3xl sm:rounded-3xl p-6 pb-8 sm:pb-6 relative"
            >
              <button onClick={closeModal} className="absolute top-4 right-4 text-[#666] hover:text-white transition-colors">
                <IconX />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <img src="/icons/forge-logo.png" alt="FORGE" className="w-9 h-9 object-contain" />
                <div>
                  <p className="font-display font-black text-base text-white uppercase leading-none" style={{ fontFamily: 'var(--font-display)' }}>Forge AI</p>
                  <p className="text-[10px] text-[#666] uppercase tracking-widest">Fale com seu coach</p>
                </div>
              </div>

              {/* Mic button + status */}
              <div className="flex flex-col items-center justify-center py-6">
                <motion.button
                  onClick={status === 'listening' ? stopListening : startListening}
                  disabled={status === 'processing' || !supported}
                  whileTap={{ scale: 0.93 }}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                    status === 'listening'
                      ? 'bg-[#FF3B30]/15 border-2 border-[#FF3B30] text-[#FF3B30]'
                      : 'forge-gradient-bg text-white'
                  } ${(status === 'processing' || !supported) ? 'opacity-50' : ''}`}
                >
                  <AnimatePresence>
                    {status === 'listening' && (
                      <motion.span
                        initial={{ scale: 0.8, opacity: 0.6 }}
                        animate={{ scale: 1.6, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                        className="absolute inset-0 rounded-full border-2 border-[#FF3B30]"
                      />
                    )}
                  </AnimatePresence>
                  <IconMic size={32} />
                </motion.button>

                <p className="text-sm text-[#888] mt-4 text-center min-h-[20px]">
                  {status === 'idle' && (supported ? 'Toque e fale — peça seu treino, registre uma refeição, ou tire uma dúvida' : 'Reconhecimento de voz não disponível neste navegador. Digite abaixo.')}
                  {status === 'listening' && 'Ouvindo...'}
                  {status === 'processing' && 'Processando...'}
                  {status === 'result' && 'Pronto!'}
                </p>

                {transcript && (status === 'listening' || status === 'processing') && (
                  <p className="text-white text-sm mt-3 text-center px-4 italic">"{transcript}"</p>
                )}
              </div>

              {/* Result */}
              {status === 'result' && reply && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl bg-[#1B1B1B] border border-[#2A2A2A] p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full forge-gradient-bg flex items-center justify-center text-white mt-0.5"><IconCheck /></span>
                    <p className="text-white text-sm leading-relaxed">{reply}</p>
                  </div>
                </motion.div>
              )}

              {status === 'result' && (
                <button onClick={reset} className="btn btn-ghost btn-sm w-full mb-2">Falar de novo</button>
              )}

              {/* Text fallback - always available */}
              {status !== 'listening' && status !== 'processing' && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && textInput.trim()) { handleSubmit(textInput.trim()) } }}
                    placeholder="Ou digite aqui..."
                    className="flex-1 bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white text-sm placeholder-[#444] focus:outline-none focus:border-[#FF6A00]/40"
                  />
                  <button
                    onClick={() => textInput.trim() && handleSubmit(textInput.trim())}
                    disabled={!textInput.trim()}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${textInput.trim() ? 'forge-gradient-bg text-white' : 'bg-[#1C1C1C] text-[#444]'}`}
                  >
                    <IconSend />
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
