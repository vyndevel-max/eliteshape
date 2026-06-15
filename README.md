# EliteShape AI — Guia Completo de Setup

Plataforma de preparação física de alto nível com IA. Construída com **Next.js 14 + Supabase + OpenAI GPT-4o**.

---

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Estilo | Tailwind CSS, Framer Motion, Barlow Condensed + DM Sans |
| Backend | Next.js API Routes (serverless) |
| Banco de Dados | Supabase (PostgreSQL + Auth + Storage + RLS) |
| IA | OpenAI GPT-4o (análise visual), GPT-4o-mini (chat, refeições) |
| Deploy | Vercel |

---

## Estrutura de Pastas

```
eliteshape/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Main app (SSR auth check)
│   │   ├── globals.css             # Design system + CSS variables
│   │   ├── auth/
│   │   │   ├── page.tsx            # Login / Signup
│   │   │   └── callback/route.ts  # Supabase OAuth callback
│   │   └── api/
│   │       └── ai/
│   │           ├── analyze/route.ts  # Body analysis (GPT-4o Vision)
│   │           ├── chat/route.ts     # Coach chat
│   │           ├── plan/route.ts     # Text-only plan generation
│   │           └── meal/route.ts     # Food macro recognition
│   ├── components/
│   │   ├── layout/
│   │   │   └── AppShell.tsx        # Sidebar + panel router
│   │   └── features/
│   │       ├── coach/CoachPanel.tsx       # AI body analysis + chat
│   │       ├── training/TrainingPanel.tsx # Training plans
│   │       ├── nutrition/NutritionPanel.tsx # Macro tracking
│   │       ├── profile/ProfilePanel.tsx   # User profile
│   │       ├── ranking/RankingPanel.tsx   # Leaderboard
│   │       ├── community/CommunityPanel.tsx
│   │       └── admin/AdminPanel.tsx       # Admin dashboard
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts   # Browser Supabase client
│   │   │   └── server.ts   # Server + Admin Supabase client
│   │   ├── openai.ts       # All OpenAI interactions
│   │   ├── store.ts        # Zustand global state
│   │   └── utils.ts        # Helpers
│   ├── types/
│   │   └── supabase.ts     # Full TypeScript types
│   └── middleware.ts       # Auth protection
├── supabase/
│   └── schema.sql          # Complete DB schema
├── .env.example
├── vercel.json
├── tailwind.config.ts
└── package.json
```

---

## Setup Passo a Passo

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. No SQL Editor, execute todo o conteúdo de `supabase/schema.sql`
3. Em **Storage**, crie dois buckets:
   - `shape-photos` (privado)
   - `avatars` (público)
4. Copie as chaves em **Settings → API**

### 2. OpenAI

1. Crie uma conta em [platform.openai.com](https://platform.openai.com)
2. Gere uma API key em **API Keys**
3. Certifique-se de ter acesso ao modelo `gpt-4o` (pode precisar adicionar créditos)

### 3. Instalação Local

```bash
# Clone e instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env.local
# Preencha todas as variáveis

# Rodar em desenvolvimento
npm run dev
```

### 4. Deploy no Vercel

```bash
# Instale a CLI da Vercel
npm install -g vercel

# Deploy
vercel --prod
```

**No Dashboard da Vercel**, adicione as variáveis de ambiente:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_APP_URL` → URL da Vercel

---

## Variáveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_APP_URL=https://seu-projeto.vercel.app
```

---

## Modelos de IA Utilizados

| Função | Modelo | Motivo |
|--------|--------|--------|
| Análise corporal por fotos | `gpt-4o` | Visão computacional de alta qualidade |
| Geração de planos por texto | `gpt-4o` | Melhor raciocínio nutricional/fitness |
| Chat com coach | `gpt-4o-mini` | Respostas rápidas e econômicas |
| Reconhecimento de alimentos | `gpt-4o-mini` | Rápido e preciso para macros |

---

## Funcionalidades Principais

### Análise de Shape (Premium)
- Upload de 1-5 fotos em poses padrão de fisiculturismo
- GPT-4o analisa composição corporal, pontos fortes/fracos, % gordura estimada
- Gera plano de treino + nutrição completo em markdown
- Salva histórico de análises no Supabase (tabela `shape_history`)
- **Roast Mode**: análise viral/humorística do shape

### Nutrição
- Registro de refeições em linguagem natural (IA interpreta macros automaticamente)
- Rastreamento de calorias, proteína, carboidratos e gordura vs. metas personalizadas
- Controle de hidratação
- Plano nutricional gerado por IA disponível em aba separada

### Treino
- Visualização do protocolo semanal por dia
- Plano de treino completo em markdown
- Marcar treino como concluído (atualiza `daily_missions`)
- Regenerar plano via IA

### Chat com Coach
- Histórico de conversa por sessão
- Coach responde em português ou inglês conforme perfil
- Contexto da última análise incluído no prompt

### Perfil
- Dados físicos: idade, altura, peso, % gordura, gênero
- Objetivo, nível, frequência, horário de treino
- Dieta atual, orçamento alimentar, suplementação
- Estilo do coach (motivacional, técnico, raiz)
- Barra de completude do perfil

### Ranking
- Leaderboard baseado em `points` da tabela `profiles`
- Destaques para membros premium

### Admin
- Lista de usuários com status premium/free
- Toggle premium por usuário
- Stats básicos (total, premium, free, novos hoje)

---

## Sistema de Autenticação

- **Supabase Auth** (email/senha)
- Trigger automático cria `profiles` na tabela ao signup
- Middleware Next.js protege todas as rotas (redireciona para `/auth`)
- JWT gerenciado automaticamente pelo `@supabase/ssr`

---

## Row Level Security (RLS)

Todas as tabelas têm RLS habilitado:
- Usuários só acessam seus próprios dados (`auth.uid() = user_id`)
- `system_settings` é lido por todos, escrito apenas via service role
- Admin usa service role key para bypass de RLS

---

## Design System

### Fonts
- **Display**: Barlow Condensed (800, 900) — headings, botões, labels
- **Body**: DM Sans — textos corridos, parágrafos
- **Mono**: JetBrains Mono — valores numéricos, código

### Cores
```css
--red: #E8002D        /* Ação primária, destaque */
--black: #080808      /* Background principal */
--surface: #111111    /* Cards primários */
--surface-2: #1A1A1A  /* Cards secundários */
--border: #252525     /* Bordas */
--text: #E8E8E8       /* Texto principal */
--muted: #666666      /* Texto secundário */
```

### Classes Utilitárias CSS
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost` — sistema de botões
- `.input`, `.input-label` — campos de formulário
- `.glass` — efeito glassmorphism
- `.stat-value`, `.stat-label` — cards de métricas
- `.progress-track`, `.progress-fill` — barras de progresso
- `.prose-dark` — estilos para markdown renderizado
- `.shimmer` — loading skeleton animado
- `.stagger` — animação em cascata para listas

---

## Como Adicionar Funcionalidades

### Nova feature/painel:
1. Criar componente em `src/components/features/nova-feature/`
2. Registrar no `PANELS` de `AppShell.tsx`
3. Adicionar ao array `NAV_ITEMS` com ícone SVG
4. Adicionar rota de API em `src/app/api/` se necessário

### Novo endpoint de IA:
1. Criar função em `src/lib/openai.ts`
2. Criar route handler em `src/app/api/ai/nome/route.ts`
3. Chamar via `fetch('/api/ai/nome', ...)` do cliente

---

## Custos Estimados (OpenAI)

| Operação | Modelo | Custo médio |
|----------|--------|-------------|
| Análise de shape (1 foto) | gpt-4o | ~$0.02-0.05 |
| Análise de shape (5 fotos) | gpt-4o | ~$0.10-0.25 |
| Geração de plano (texto) | gpt-4o | ~$0.02-0.05 |
| Mensagem de chat | gpt-4o-mini | ~$0.001 |
| Reconhecimento de refeição | gpt-4o-mini | ~$0.0005 |

Para controle de custos, implemente rate limiting por usuário na tabela `usage_logs`.
