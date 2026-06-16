// src/components/features/admin/AdminPanel.tsx
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/supabase'
import toast from 'react-hot-toast'

interface AdminPanelProps { profile: Profile; onProfileUpdate: any }

interface Coupon {
  id: string
  code: string
  discount_type: 'percent' | 'fixed_amount' | 'fixed_price'
  discount_value: number
  max_uses: number | null
  uses_count: number
  active: boolean
  expires_at: string | null
  created_at: string
}

export default function AdminPanel({ profile }: AdminPanelProps) {
  const [users, setUsers] = useState<any[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<'users' | 'coupons'>('users')
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [newCoupon, setNewCoupon] = useState({ code: '', discount_type: 'fixed_price' as Coupon['discount_type'], discount_value: '0.01', max_uses: '' })
  const [creatingCoupon, setCreatingCoupon] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (profile.role !== 'admin') return
    supabase.from('profiles').select('id, name, email, is_premium, points, created_at').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => { if (data) setUsers(data) })
    supabase.from('system_settings').select('*').then(({ data }) => {
      if (data) setSettings(Object.fromEntries(data.map(d => [d.key, d.value])))
    })
    loadCoupons()
  }, [])

  const loadCoupons = async () => {
    const { data } = await supabase.from('coupons' as any).select('*').order('created_at', { ascending: false })
    if (data) setCoupons(data as Coupon[])
  }

  const createCoupon = async () => {
    const code = newCoupon.code.trim().toUpperCase()
    if (!code) { toast.error('Informe um código'); return }
    const value = parseFloat(newCoupon.discount_value)
    if (isNaN(value) || value < 0) { toast.error('Valor de desconto inválido'); return }

    setCreatingCoupon(true)
    try {
      const { error } = await supabase.from('coupons' as any).insert({
        code,
        discount_type: newCoupon.discount_type,
        discount_value: value,
        max_uses: newCoupon.max_uses ? parseInt(newCoupon.max_uses) : null,
        active: true,
        created_by: profile.id,
      })
      if (error) throw error
      toast.success(`Cupom ${code} criado!`)
      setNewCoupon({ code: '', discount_type: 'fixed_price', discount_value: '0.01', max_uses: '' })
      loadCoupons()
    } catch (e: any) {
      toast.error(e.message?.includes('duplicate') ? 'Já existe um cupom com esse código' : 'Erro ao criar cupom')
    } finally {
      setCreatingCoupon(false)
    }
  }

  const toggleCouponActive = async (couponId: string, current: boolean) => {
    await supabase.from('coupons' as any).update({ active: !current }).eq('id', couponId)
    setCoupons(prev => prev.map(c => c.id === couponId ? { ...c, active: !current } : c))
    toast.success(!current ? 'Cupom ativado' : 'Cupom desativado')
  }

  const discountLabel = (c: Coupon) => {
    if (c.discount_type === 'percent') return `${c.discount_value}% off`
    if (c.discount_type === 'fixed_amount') return `R$ ${c.discount_value.toFixed(2)} off`
    return `Preço fixo: R$ ${c.discount_value.toFixed(2)}`
  }

  if (profile.role !== 'admin') {
    return <div className="p-8 text-[#555]">Acesso negado.</div>
  }

  const togglePremium = async (userId: string, current: boolean) => {
    await supabase.from('profiles').update({ is_premium: !current }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_premium: !current } : u))
    toast.success('Status atualizado')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-4 sm:px-8 py-5 sm:py-6 border-b border-[#222222]">
        <h1 className="font-display text-3xl font-black text-white uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>ADMIN</h1>
        <p className="text-[#555] text-sm mt-0.5">Painel de controle da plataforma</p>
      </div>
      <div className="flex-1 p-4 sm:p-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'USUÁRIOS', value: users.length },
            { label: 'PREMIUM', value: users.filter(u => u.is_premium).length },
            { label: 'GRATUITOS', value: users.filter(u => !u.is_premium).length },
            { label: 'HOJE', value: users.filter(u => u.created_at?.startsWith(new Date().toISOString().split('T')[0])).length },
          ].map(stat => (
            <div key={stat.label} className="rounded-2xl bg-[#161616] border border-[#222222] p-5">
              <p className="text-xs font-black uppercase tracking-widest text-[#555] mb-1" style={{ fontFamily: 'var(--font-display)' }}>{stat.label}</p>
              <p className="font-display text-3xl font-black text-white" style={{ fontFamily: 'var(--font-display)' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('users')}
            className={`text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all ${tab === 'users' ? 'forge-gradient-bg text-white' : 'bg-[#1B1B1B] text-[#666] hover:text-white'}`}>
            Usuários
          </button>
          <button onClick={() => setTab('coupons')}
            className={`text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all ${tab === 'coupons' ? 'forge-gradient-bg text-white' : 'bg-[#1B1B1B] text-[#666] hover:text-white'}`}>
            Cupons
          </button>
        </div>

        {tab === 'users' && (
        <>
        {/* Users Table */}
        <div className="rounded-2xl bg-[#161616] border border-[#222222] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#222222]">
            <p className="text-xs font-black uppercase tracking-widest text-[#555]" style={{ fontFamily: 'var(--font-display)' }}>USUÁRIOS RECENTES</p>
          </div>
          {users.map(user => (
            <div key={user.id} className="flex items-center gap-4 px-6 py-4 border-b border-[#222222] last:border-0 hover:bg-white/[0.02] transition-colors">
              <div className="w-8 h-8 rounded-full bg-[#FF3B30]/20 flex items-center justify-center text-[#FF3B30] text-xs font-bold">
                {user.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{user.name}</p>
                <p className="text-xs text-[#444] truncate">{user.email}</p>
              </div>
              <p className="text-xs text-[#444] hidden sm:block">{user.points} pts</p>
              <button
                onClick={() => togglePremium(user.id, user.is_premium)}
                className={`text-xs font-black px-3 py-1 rounded-full transition-all ${user.is_premium ? 'bg-[#FF3B30]/20 text-[#FF3B30] hover:bg-[#FF3B30]/30' : 'bg-[#2A2A2A] text-[#666] hover:bg-[#333]'}`}
              >
                {user.is_premium ? 'PREMIUM' : 'FREE'}
              </button>
            </div>
          ))}
        </div>
        </>
        )}

        {tab === 'coupons' && (
        <>
        {/* Create coupon form */}
        <div className="rounded-2xl bg-[#161616] border border-[#222222] p-6 mb-6">
          <p className="text-xs font-black uppercase tracking-widest text-[#555] mb-4" style={{ fontFamily: 'var(--font-display)' }}>NOVO CUPOM</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text" placeholder="CÓDIGO (ex: TESTE)"
              value={newCoupon.code}
              onChange={e => setNewCoupon(p => ({ ...p, code: e.target.value.toUpperCase() }))}
              className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl px-3 py-2.5 text-white text-sm uppercase placeholder-[#444] focus:outline-none focus:border-[#FF6A00]/40"
            />
            <select
              value={newCoupon.discount_type}
              onChange={e => setNewCoupon(p => ({ ...p, discount_type: e.target.value as Coupon['discount_type'] }))}
              className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#FF6A00]/40"
            >
              <option value="fixed_price">Preço fixo (teste)</option>
              <option value="percent">% de desconto</option>
              <option value="fixed_amount">R$ de desconto</option>
            </select>
            <input
              type="number" step="0.01" placeholder="Valor"
              value={newCoupon.discount_value}
              onChange={e => setNewCoupon(p => ({ ...p, discount_value: e.target.value }))}
              className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#444] focus:outline-none focus:border-[#FF6A00]/40"
            />
            <input
              type="number" placeholder="Limite de usos (vazio = ilimitado)"
              value={newCoupon.max_uses}
              onChange={e => setNewCoupon(p => ({ ...p, max_uses: e.target.value }))}
              className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#444] focus:outline-none focus:border-[#FF6A00]/40"
            />
          </div>
          <p className="text-[#555] text-xs mt-2">
            Dica para testar pagamento real sem gastar: crie um cupom "Preço fixo" com valor 0.01 — você paga só 1 centavo via Pix e confirma que todo o fluxo (webhook, ativação do premium, Discord) funciona de ponta a ponta.
          </p>
          <button onClick={createCoupon} disabled={creatingCoupon} className="btn btn-primary mt-4 disabled:opacity-50">
            {creatingCoupon ? 'Criando...' : 'Criar cupom'}
          </button>
        </div>

        {/* Coupons list */}
        <div className="rounded-2xl bg-[#161616] border border-[#222222] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#222222]">
            <p className="text-xs font-black uppercase tracking-widest text-[#555]" style={{ fontFamily: 'var(--font-display)' }}>CUPONS CRIADOS</p>
          </div>
          {coupons.length === 0 ? (
            <p className="text-[#555] text-sm px-6 py-8 text-center">Nenhum cupom criado ainda</p>
          ) : coupons.map(c => (
            <div key={c.id} className="flex items-center gap-4 px-6 py-4 border-b border-[#222222] last:border-0 hover:bg-white/[0.02] transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-bold font-mono">{c.code}</p>
                <p className="text-xs text-[#666]">{discountLabel(c)} · {c.uses_count}{c.max_uses ? `/${c.max_uses}` : ''} usos</p>
              </div>
              <button
                onClick={() => toggleCouponActive(c.id, c.active)}
                className={`text-xs font-black px-3 py-1 rounded-full transition-all ${c.active ? 'bg-[#22C55E]/20 text-[#22C55E] hover:bg-[#22C55E]/30' : 'bg-[#2A2A2A] text-[#666] hover:bg-[#333]'}`}
              >
                {c.active ? 'ATIVO' : 'INATIVO'}
              </button>
            </div>
          ))}
        </div>
        </>
        )}
      </div>
    </div>
  )
}
