// src/components/ui/VoiceInputButton.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const IconMic = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
)

interface VoiceInputButtonProps {
  /** Called with the final transcribed text when recognition ends */
  onResult: (text: string) => void
  /** Optional: called continuously with interim transcript while listening */
  onInterim?: (text: string) => void
  lang?: string
  className?: string
  size?: 'sm' | 'md'
  /** Label shown next to the icon (optional) */
  label?: string
}

// Lazily resolve the SpeechRecognition constructor (vendor-prefixed in Chrome/Edge/Android)
function getSpeechRecognition(): any {
  if (typeof window === 'undefined') return null
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null
}

export default function VoiceInputButton({ onResult, onInterim, lang = 'pt-BR', className = '', size = 'md', label }: VoiceInputButtonProps) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    setSupported(!!getSpeechRecognition())
  }, [])

  const stop = () => {
    recognitionRef.current?.stop()
    setListening(false)
  }

  const start = () => {
    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition) { setSupported(false); return }

    const recognition = new SpeechRecognition()
    recognition.lang = lang
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    let finalTranscript = ''

    recognition.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) finalTranscript += transcript
        else interim += transcript
      }
      if (onInterim) onInterim(finalTranscript + interim)
    }

    recognition.onerror = () => {
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
      if (finalTranscript.trim()) onResult(finalTranscript.trim())
    }

    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
  }

  const toggle = () => (listening ? stop() : start())

  if (!supported) return null

  const dim = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? 'Parar gravação' : 'Falar'}
      className={`relative flex items-center justify-center gap-2 rounded-xl border transition-all flex-shrink-0 ${dim} ${
        listening
          ? 'bg-[#FF3B30]/15 border-[#FF3B30]/40 text-[#FF3B30]'
          : 'bg-[#0E0E0E] border-[#222222] text-[#555] hover:border-[#333] hover:text-[#999]'
      } ${label ? 'w-auto px-3' : ''} ${className}`}
    >
      <AnimatePresence>
        {listening && (
          <motion.span
            initial={{ scale: 0.6, opacity: 0.6 }}
            animate={{ scale: 1.8, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut' }}
            className="absolute inset-0 rounded-xl border border-[#FF3B30]"
          />
        )}
      </AnimatePresence>
      <IconMic />
      {label && <span className="text-xs font-medium">{listening ? 'Ouvindo...' : label}</span>}
    </button>
  )
}
