// src/components/features/chat/ChatPanel.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Markdown from 'react-markdown'
import type { Profile } from '@/types/supabase'
import toast from 'react-hot-toast'

const IconSend = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
const IconLoader = () => <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/></svg>
const IconCoach = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
const IconZap = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>

interface ChatPanelProps { profile: Profile; onProfileUpdate: (data: Partial<Profile>) => void }
interface Message { role: 'user' | 'assistant'; content: string }

const QUICK_QUESTIONS = [
  'Quais são meus pontos fracos?',
  'Como melhorar minha dieta?',
  'Quantas calorias devo comer?',
  'Como ganhar músculo mais rápido?',
  'O que comer antes do treino?',
  'Como perder gordura sem perder músculo?',
]

export default function ChatPanel({ profile }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Build rich context from profile analysis
  const analysisContext = (() => {
    if (!profile.last_analysis) return null
    try { return JSON.parse(profile.last_analysis) } catch { return null }
  })()

  const hasAnalysis = !!analysisContext

  // Auto-greeting on first open
  useEffect(() => {
    if (messages.length === 0) {
      const greeting = buildGreeting()
      setMessages([{ role: 'assistant', content: greeting }])
    }
  }, [])

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [messages])

  const buildGreeting = () => {
    const name = profile.name ? profile.name.split(' ')[0] : 'atleta'
    const mode = (profile as any).personality_mode || 'motivational'

    if (!hasAnalysis && !profile.training_plan) {
      if (mode === 'motivational') return `E aí ${name}! 🔥 Tô aqui pra te ajudar a chegar onde você quer. Ainda não fizemos sua análise corporal — que tal começar por lá? Mas pode me perguntar qualquer coisa sobre treino e alimentação!`
      if (mode === 'raiz') return `Oi ${name}. Sem análise ainda. Pode me perguntar sobre treino e dieta que respondo direto.`
      return `Olá ${name}. Ainda não há uma análise corporal registrada. Pode fazer perguntas sobre treino e nutrição à vontade.`
    }

    const score = analysisContext?.overall_score
    const bf = analysisContext?.fat_percentage_estimate
    const strong = analysisContext?.strong_points?.slice(0, 2).join(', ')
    const weak = analysisContext?.weak_points?.slice(0, 2).join(', ')
    const objective = profile.objective || 'seus objetivos'

    if (mode === 'motivational') {
      return `Fala ${name}! 💪 Baseado na sua análise, você tem muito potencial! Sua nota foi **${score}/10**, com **${bf}% de gordura**. Seus pontos fortes são: **${strong}**. As áreas pra focar: **${weak}**. Vamos trabalhar em cima disso pra você conquistar **${objective}**! Me pergunte qualquer coisa!`
    }
    if (mode === 'raiz') {
      return `${name}, análise feita. Nota ${score}/10, ${bf}% gordura. Pontos fortes: ${strong}. Pontos fracos: ${weak}. Objetivo: ${objective}. O que quer saber?`
    }
    return `Olá ${name}. Análise registrada: score **${score}/10**, **${bf}%** de gordura corporal. Pontos fortes identificados: ${strong}. Áreas prioritárias: ${weak}. Objetivo atual: ${objective}. Como posso ajudar?`
  }

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')

    const newMessages: Message[] = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages)
    setLoading(true)

    try {
      // Build full context for the API
      const contextualProfile = {
        ...profile,
        // Pass full analysis context
        analysis_summary: analysisContext ? `
Score: ${analysisContext.overall_score}/10
Gordura estimada: ${analysisContext.fat_percentage_estimate}%
Massa muscular: ${analysisContext.muscle_mass}
Pontos fortes: ${analysisContext.strong_points?.join(', ')}
Pontos fracos: ${analysisContext.weak_points?.join(', ')}
Músculos prioritários: ${analysisContext.priority_muscles?.join(', ')}
Foco de treino: ${analysisContext.training_focus}
Abordagem nutricional: ${analysisContext.diet_approach}
Prazo estimado: ${analysisContext.estimated_timeframe}
` : null,
        nutrition_context: profile.target_calories ? `
Calorias alvo: ${profile.target_calories} kcal
Proteína alvo: ${profile.target_protein}g
Carboidratos alvo: ${profile.target_carbs}g
Gordura alvo: ${profile.target_fat}g
` : null,
      }

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.slice(-10), // last 10 messages for context
          profile: contextualProfile,
          lastAnalysis: profile.last_analysis,
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      toast.error('Erro ao conectar com o Coach')
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-8 py-5 border-b border-[#1C1C1C] flex items-center gap-4 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-[#E8002D]/10 border border-[#E8002D]/20 flex items-center justify-center text-[#E8002D]">
          <IconCoach />
        </div>
        <div>
          <h1 className="font-display text-2xl font-black text-white uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>CHAT COM O COACH</h1>
          <p className="text-[#555] text-xs mt-0.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Coach online — responde sobre treino e nutrição
          </p>
        </div>
        {hasAnalysis && (
          <div className="ml-auto flex items-center gap-2 bg-[#111] border border-[#1C1C1C] rounded-xl px-4 py-2">
            <IconZap />
            <span className="text-xs text-[#666]">Análise carregada</span>
            <span className="text-xs font-black text-[#E8002D]">{analysisContext?.overall_score}/10</span>
          </div>
        )}
      </div>

      {/* Context banner if no analysis */}
      {!hasAnalysis && (
        <div className="mx-6 mt-4 p-4 rounded-xl bg-[#111] border border-[#1C1C1C] flex items-start gap-3 flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" className="flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p className="text-xs text-[#666] leading-relaxed">
            Dica: Para respostas mais precisas, <span className="text-white">faça sua análise corporal</span> em "Análise Corporal" primeiro. Assim o coach conhece seu físico de verdade!
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.map((msg, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-[#E8002D]/10 border border-[#E8002D]/20 flex items-center justify-center text-[#E8002D] mr-3 flex-shrink-0 mt-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              </div>
            )}
            <div className={`max-w-[75%] rounded-2xl px-5 py-4 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-[#E8002D] text-white rounded-tr-sm'
                : 'bg-[#111] border border-[#1C1C1C] text-[#CCC] rounded-tl-sm'
            }`}>
              {msg.role === 'assistant'
                ? <div className="prose-dark text-sm"><Markdown>{msg.content}</Markdown></div>
                : msg.content
              }
            </div>
          </motion.div>
        ))}

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="w-8 h-8 rounded-lg bg-[#E8002D]/10 border border-[#E8002D]/20 flex items-center justify-center text-[#E8002D] mr-3 flex-shrink-0">
              <IconLoader />
            </div>
            <div className="bg-[#111] border border-[#1C1C1C] rounded-2xl rounded-tl-sm px-5 py-4">
              <div className="flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E8002D] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#E8002D] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#E8002D] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick questions */}
      {messages.length <= 1 && (
        <div className="px-6 pb-3 flex-shrink-0">
          <p className="text-[10px] uppercase tracking-widest text-[#333] mb-2" style={{ fontFamily: 'var(--font-display)' }}>PERGUNTAS RÁPIDAS</p>
          <div className="flex gap-2 flex-wrap">
            {QUICK_QUESTIONS.map(q => (
              <button key={q} onClick={() => sendMessage(q)}
                className="text-xs text-[#555] border border-[#1C1C1C] hover:border-[#E8002D]/30 hover:text-[#999] rounded-xl px-3 py-2 transition-all">
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-6 pb-6 pt-3 flex-shrink-0">
        <div className="flex gap-3 bg-[#111] border border-[#1C1C1C] rounded-2xl p-2 focus-within:border-[#E8002D]/30 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Pergunte ao seu coach de elite..."
            rows={1}
            className="flex-1 bg-transparent text-white text-sm placeholder-[#444] resize-none focus:outline-none px-3 py-2 max-h-32"
            style={{ overflowY: 'auto' }}
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all self-end mb-0.5 ${input.trim() && !loading ? 'bg-[#E8002D] text-white hover:bg-[#CC0026]' : 'bg-[#1C1C1C] text-[#444]'}`}>
            <IconSend />
          </button>
        </div>
        <p className="text-[10px] text-[#333] mt-2 text-center">Enter para enviar · Shift+Enter para nova linha</p>
      </div>
    </div>
  )
}
