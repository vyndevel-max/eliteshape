// src/app/auth/page.tsx
'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

// SVG Icons
const IconLogo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" fill="#E8002D"/>
    <path d="M8 22V10h4l4 8 4-8h4v12h-3v-7l-3.5 7h-3L11 15v7H8z" fill="white"/>
  </svg>
)

const IconMail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
)

const IconLock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
)

const IconArrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
)

const IconEye = ({ off }: { off?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {off ? (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </>
    ) : (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </>
    )}
  </svg>
)

const FEATURES = [
  { title: 'Análise de Shape por IA', desc: 'Visão computacional analisa sua composição corporal em segundos' },
  { title: 'Treinos Personalizados', desc: 'Protocolos adaptados ao seu nível, objetivo e disponibilidade' },
  { title: 'Nutrição de Precisão', desc: 'Planos macro-calibrados com reconhecimento de alimentos por IA' },
  { title: 'Coach Especialista 24/7', desc: 'Chat direto com IA treinada em ciência do esporte de elite' },
]

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { name: form.name } },
        })
        if (error) throw error
        toast.success('Conta criada! Verifique seu e-mail.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        })
        if (error) throw error
        router.push('/')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials'
        ? 'E-mail ou senha incorretos.'
        : err.message || 'Erro ao autenticar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4 overflow-hidden relative">
      {/* Background grid */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        />
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#E8002D] opacity-[0.06] blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#6366F1] opacity-[0.04] blur-[100px]" />
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1fr_480px] rounded-2xl overflow-hidden border border-white/[0.06] shadow-2xl relative z-10">
        {/* LEFT: Branding */}
        <div className="hidden lg:flex flex-col bg-[#0E0E0E] p-12 relative overflow-hidden">
          {/* Decorative lines */}
          <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-white/10 to-transparent" />
          <div className="absolute top-24 left-0 right-0 h-px bg-gradient-to-r from-[#E8002D]/30 via-transparent to-transparent" />

          <div className="flex items-center gap-3 mb-16">
            <IconLogo />
            <div>
              <p className="font-display font-800 text-xl tracking-widest text-white uppercase" style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>ELITESHAPE</p>
              <p className="text-[10px] text-[#E8002D] tracking-[0.3em] uppercase font-mono">AI PERFORMANCE</p>
            </div>
          </div>

          <div className="flex-1">
            <h1 className="font-display text-5xl font-black text-white uppercase leading-none mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              TRANSFORME<br/>SEU SHAPE
            </h1>
            <p className="text-[#E8002D] font-display text-2xl font-700 uppercase tracking-wider mb-8" style={{ fontFamily: 'var(--font-display)' }}>
              EM 90 DIAS
            </p>
            <p className="text-[#666] text-sm leading-relaxed max-w-xs mb-12">
              Protocolo de elite com inteligência artificial. Análise real, planos reais, resultados reais.
            </p>

            <div className="space-y-5">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.1 }}
                  className="flex gap-4 items-start"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#E8002D]/10 border border-[#E8002D]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8002D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{f.title}</p>
                    <p className="text-[#555] text-xs mt-0.5">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/[0.06]">
            <p className="text-[#444] text-xs tracking-widest uppercase">+5.000 atletas de elite</p>
          </div>
        </div>

        {/* RIGHT: Auth Form */}
        <div className="bg-[#111] p-8 lg:p-12 flex flex-col justify-center">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <IconLogo />
            <p className="font-display font-800 text-lg tracking-widest text-white uppercase" style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>ELITESHAPE AI</p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-1">
                  {mode === 'login' ? 'Bem-vindo de volta' : 'Inicie sua jornada'}
                </h2>
                <p className="text-[#666] text-sm">
                  {mode === 'login'
                    ? 'Acesse sua central de comando.'
                    : 'Crie sua conta e receba seu primeiro plano de elite.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="input-label">Nome completo</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#444]"><IconUser /></span>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        className="input pl-11"
                        placeholder="Seu nome completo"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="input-label">E-mail</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#444]"><IconMail /></span>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="input pl-11"
                      placeholder="atleta@elite.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="input-label">Senha</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#444]"><IconLock /></span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="input pl-11 pr-12"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#444] hover:text-[#999] transition-colors"
                    >
                      <IconEye off={showPassword} />
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-[#E8002D]/10 border border-[#E8002D]/20 rounded-lg p-3 text-[#E8002D] text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full mt-2"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {loading ? (
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <>
                      {mode === 'login' ? 'ENTRAR' : 'CRIAR CONTA'}
                      <IconArrow />
                    </>
                  )}
                </button>

                <p className="text-center text-[#555] text-sm pt-2">
                  {mode === 'login' ? 'Novo por aqui?' : 'Já possui conta?'}{' '}
                  <button
                    type="button"
                    onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(null) }}
                    className="text-[#E8002D] font-semibold hover:underline"
                  >
                    {mode === 'login' ? 'Criar conta' : 'Fazer login'}
                  </button>
                </p>
              </form>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
