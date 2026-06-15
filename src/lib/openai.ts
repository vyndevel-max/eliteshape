// src/lib/openai.ts
// All OpenAI interactions go through this service
import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// ============================================================
// TYPES
// ============================================================
export interface AnalysisResult {
  overall_score: number        // 0-10
  fat_percentage_estimate: number
  muscle_mass: 'low' | 'moderate' | 'high' | 'very_high'
  strong_points: string[]
  weak_points: string[]
  priority_muscles: string[]
  training_focus: string
  diet_approach: string
  training_plan: string        // markdown
  nutrition_plan: string       // markdown
  motivational_message: string
  week_protocol: Record<string, string>
  nutrition_schedule: Record<string, any>
  estimated_timeframe: string
}

export interface MacroResult {
  calories: number
  protein: number
  carbs: number
  fat: number
  name: string
  meal_type: string
}

// ============================================================
// SYSTEM PROMPTS
// ============================================================
const ELITE_COACH_PERSONA = `
Você é o ELITE SHAPE AI — o coach de treino e nutrição mais avançado do mundo.
Combine o conhecimento de fisiculturistas de elite, cientistas do esporte e nutricionistas.
SEMPRE responda no idioma do usuário (pt-BR ou en-US conforme indicado).
SEMPRE responda em português do Brasil quando o idioma for pt-BR.
NÃO use inglês em nenhuma palavra se o idioma for pt-BR.

Adapte sua PERSONALIDADE conforme o modo:
- motivational: energia máxima, hype, frases de impacto, use exclamações, motive o atleta, celebre pontos fortes com entusiasmo antes de falar fraquezas
- technical: linguagem científica precisa, cite estudos, seja detalhado e educativo, explique o porquê de cada recomendação
- raiz: direto ao ponto, sem rodeios, linguagem simples e prática, fale os pontos fracos sem filtro mas com respeito
`

const PERSONALITY_INSTRUCTIONS: Record<string, string> = {
  motivational: `Tom motivacional: Comece SEMPRE destacando os pontos fortes com entusiasmo e frases de impacto. Use emojis estratégicos. Depois aborde fraquezas como "oportunidades de crescimento". Finalize com uma mensagem que faça o atleta querer treinar agora.`,
  technical: `Tom técnico: Use terminologia científica. Cite percentuais, taxas metabólicas, princípios de hipertrofia. Seja analítico. Explique o mecanismo fisiológico de cada recomendação. Seja preciso com números.`,
  raiz: `Tom raiz: Seja direto e sem enrolação. Fale os pontos fracos claramente sem suavizar. Use linguagem simples e prática. Diga exatamente o que o atleta precisa fazer, sem teoria desnecessária. Seja honesto mesmo que doa.`,
}

// ============================================================
// BODY ANALYSIS FROM IMAGES
// ============================================================
export async function analyzeBodyShape(params: {
  imageBase64Array: string[]
  profile: {
    age: number
    height: number
    weight: number
    gender: string
    activity_level: string
    training_level: string
    objective: string
    training_time: string
    routine: string
    sleep: string
    current_diet: string
    financial_condition: string
    wants_supplements: boolean
    personality_mode: string
    fat_percentage?: number
  }
  language: string
  tdee: number
  isRoastMode?: boolean
}): Promise<AnalysisResult> {
  const { imageBase64Array, profile, language, tdee, isRoastMode } = params
  const lang = language === 'pt' ? 'pt-BR' : 'en-US'

  const profileContext = `
Atleta/Athlete Data:
- Age: ${profile.age} years | Height: ${profile.height}cm | Weight: ${profile.weight}kg
- Gender: ${profile.gender} | Activity: ${profile.activity_level} | Level: ${profile.training_level}
- Goal/Objetivo: ${profile.objective}
- Training time/Tempo de treino: ${profile.training_time}
- Routine/Rotina: ${profile.routine}
- Sleep/Sono: ${profile.sleep}h
- Current diet/Dieta atual: ${profile.current_diet}
- Budget/Orçamento: ${profile.financial_condition}
- Supplements/Suplementos: ${profile.wants_supplements ? 'Yes/Sim' : 'No/Não'}
- TDEE: ${tdee} kcal/day
- Personality mode: ${profile.personality_mode}
`

  const personalityMode = (profile.personality_mode as string) || 'motivational'
  const personalityInstructions: Record<string, string> = {
    motivational: 'Tom motivacional: Destaque pontos fortes com MUITO entusiasmo e energia. Use frases de impacto. Celebre o que é bom antes de falar fraquezas como oportunidades de crescimento. Finalize motivando o atleta.',
    technical: 'Tom técnico: Use terminologia científica, percentuais precisos e princípios de hipertrofia. Explique o mecanismo fisiológico de cada recomendação.',
    raiz: 'Tom raiz: Seja completamente direto. Fale os pontos fracos sem suavizar. Linguagem simples e prática. Diga exatamente o que fazer sem enrolação.',
  }
  const personalityTip = personalityInstructions[personalityMode] || personalityInstructions.motivational
  const systemPrompt = isRoastMode
    ? `${ELITE_COACH_PERSONA}\nROAST MODE: Faça um roast brutal e engraçado mas educativo do físico. Máx 4 frases.\nIdioma: ${lang}`
    : `${ELITE_COACH_PERSONA}\n${personalityTip}\nAnalise as imagens e retorne JSON completo. TODAS as strings em ${lang}. Idioma: ${lang}`
  const userPrompt = isRoastMode
    ? `${profileContext}
Faça um roast BRUTAL e engraçado desse físico em ${lang}. Seja ácido mas educativo. Máx 4 frases no roast.
Retorne JSON: { "roast": "...", "score": 0-10, "priority_actions": ["...", "...", "..."], "fat_percentage_estimate": 0, "training_plan": "...", "nutrition_plan": "..." }`
    : `${profileContext}

VOCÊ É O MELHOR PERSONAL TRAINER DO BRASIL. Está vendo a foto REAL desta pessoa. Analise com olho clínico de especialista.

ANÁLISE DO FÍSICO — REGRAS ABSOLUTAS:
1. DESCREVA O QUE VÊ na foto com riqueza de detalhes — como um preparador físico profissional
2. Chame a pessoa de "campeão" ou "campeã" na mensagem motivacional
3. Se tem boa base muscular → reconheça e monte treino PESADO e volumoso (4-5 exercícios por grupo)
4. Se está acima do peso → diga com respeito e monte treino adequado
5. Se está definido/a → elogie a condição e ajuste o plano para o próximo nível
6. Score REAL (1-10): 1-3 = iniciante sem treino, 4-5 = treina mas tem bastante a melhorar, 6-7 = boa base, 8-9 = atleta avançado, 10 = elite
7. % gordura: estime visualmente (não use fórmula) — se vê barriga proeminente = 20%+, se tem definição abdominal = abaixo de 15%
8. NUNCA use inglês — TUDO em ${lang}

PLANO DE TREINO — COMO UM TREINADOR REAL:
- Se tem boa base muscular (muscle_mass = high ou very_high): monte treino SÉRIO de atleta
  * Peito: 4-5 exercícios (supino reto, inclinado, crucifixo, peck deck, paralela)
  * Costas: 4-5 exercícios (barra fixa, remada curvada, remada baixa, pulldown, serrote)
  * Ombro: dia exclusivo com 5 exercícios (desenvolvimento, elevação lateral, elevação frontal, crucifixo invertido, encolhimento)
  * Perna: dia completo (agachamento, leg press, extensora, flexora, panturrilha, adutora)
  * Bíceps: 3 exercícios isolados + Tríceps: 3 exercícios isolados
- Se tem base moderada: 3-4 exercícios por grupo
- Se é iniciante: 2-3 exercícios por grupo, básicos
- SEMPRE especifique séries e repetições reais: "4x10-12", "5x8-10", "3x15"
- Distribua 5-6 dias de treino se o nível permitir

MENSAGEM MOTIVACIONAL: personalizada para o físico desta pessoa, chame de campeão/campeã, mencione o que você viu de específico na foto, seja entusiasmado e direto

Retorne APENAS JSON válido com esta estrutura exata:
{
  "overall_score": <número 1-10 baseado no físico real das fotos>,
  "fat_percentage_estimate": <% real estimado pelo que você vê nas fotos>,
  "muscle_mass": <"low" | "moderate" | "high" | "very_high" baseado no físico real>,
  "strong_points": ["<ponto forte REAL observado nas fotos em pt-BR>", "<outro ponto forte real>"],
  "weak_points": ["<ponto fraco REAL observado em pt-BR>", "<outro ponto fraco real>"],
  "priority_muscles": ["<músculo prioritário em pt-BR>", "<outro>", "<outro>"],
  "training_focus": "<foco específico baseado no físico real e objetivo: ${profile.objective}>",
  "diet_approach": "<abordagem nutricional específica em pt-BR>",
  "motivational_message": "<mensagem motivacional personalizada em pt-BR no estilo ${profile.personality_mode || 'motivational'}>",
  "estimated_timeframe": "<prazo realista em pt-BR>",
  "week_protocol": {
    "Segunda": "<treino específico para o físico desta pessoa>",
    "Terça": "<treino>",
    "Quarta": "<treino ou recuperação>",
    "Quinta": "<treino>",
    "Sexta": "<treino>",
    "Sábado": "<treino ou recuperação>",
    "Domingo": "<descanso>"
  },
  "nutrition_schedule": {
    "target_calories": ${tdee - 300},
    "target_protein": ${Math.round(profile.weight * 2.2)},
    "target_carbs": ${Math.round((tdee - 300 - profile.weight * 2.2 * 4 - profile.weight * 0.9 * 9) / 4)},
    "target_fat": ${Math.round(profile.weight * 0.9)},
    "meal_timing": {
      "pre_workout": "<orientação pré-treino em pt-BR>",
      "post_workout": "<orientação pós-treino em pt-BR>",
      "before_bed": "<orientação antes de dormir em pt-BR>"
    }
  },
  "training_plan": "<plano detalhado em markdown COM DIAS DA SEMANA EM PORTUGUÊS, exercícios específicos com séries e reps. Use: Segunda-feira, Terça-feira etc>",
  "nutrition_plan": "<plano nutricional detalhado em markdown em pt-BR>"
}`

  const messageContent: OpenAI.ChatCompletionContentPart[] = [
    { type: 'text', text: userPrompt },
    ...imageBase64Array.map(base64 => ({
      type: 'image_url' as const,
      image_url: {
        url: `data:image/jpeg;base64,${base64}`,
        detail: 'high' as const,
      }
    }))
  ]

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: messageContent },
    ],
    max_tokens: 4096,
    temperature: 0.4,
    response_format: { type: 'json_object' },
  })

  const text = response.choices[0].message.content ?? '{}'
  return JSON.parse(text) as AnalysisResult
}

// ============================================================
// TEXT-ONLY PLAN GENERATION (no images)
// ============================================================
export async function generatePlanFromProfile(params: {
  profile: Record<string, any>
  tdee: number
  language: string
}): Promise<Pick<AnalysisResult, 'training_plan' | 'nutrition_plan' | 'week_protocol' | 'nutrition_schedule' | 'motivational_message'>> {
  const { profile, tdee, language } = params
  const lang = language === 'pt' ? 'pt-BR' : 'en-US'

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: `${ELITE_COACH_PERSONA}\nLanguage: ${lang}` },
      {
        role: 'user',
        content: `Você é o melhor personal trainer do Brasil. Monte um plano COMPLETO e REAL para:
Idade: ${profile.age} anos | Altura: ${profile.height}cm | Peso: ${profile.weight}kg
Sexo: ${profile.gender} | Nível: ${profile.training_level} | Objetivo: ${profile.objective}
Frequência: ${profile.activity_level} | TDEE: ${tdee}kcal
Horário de treino: ${profile.training_time} | Sono: ${profile.sleep}h
Saúde/Lesões: ${profile.health_conditions || 'nenhuma'}
Orçamento: ${profile.financial_condition} | Suplementos: ${profile.wants_supplements}
Dieta: ${profile.current_diet}

REGRAS DO PLANO DE TREINO:
- Iniciante: 3 dias, 2-3 exercícios por grupo, básicos
- Intermediário: 4-5 dias, 3-4 exercícios por grupo muscular
- Avançado: 5-6 dias, 4-5 exercícios por grupo, treinos dedicados (ombro isolado, perna completo)
- SEMPRE com séries e repetições: "4x10-12", "3x8-10", "5x15"
- Se avançado: Peito tem 4 exercícios, Costas tem 4-5, Ombro tem dia exclusivo com 5 exercícios, Perna completa em dia exclusivo
- Adapte para lesões/condições de saúde informadas
- Use dias da semana em PT: Segunda-feira, Terça-feira, etc
- Chame de campeão/campeã na mensagem motivacional

REGRAS DO PLANO NUTRICIONAL:
- Com quantidades reais: "150g frango grelhado", "200g arroz integral cozido", "2 ovos inteiros"
- Dividido por refeições: Café da manhã, Almoço, Jantar, Lanches, Pré-treino, Pós-treino
- Adequado ao orçamento e preferências alimentares informadas
- Total de calorias próximo de ${tdee}kcal

Retorne JSON: { "training_plan": "markdown detalhado", "nutrition_plan": "markdown com quantidades", "week_protocol": {"Segunda": "...", "Terça": "..."}, "nutrition_schedule": { "target_calories": ${tdee}, "target_protein": ${Math.round(profile.weight * 2.2)}, "target_carbs": ${Math.round(profile.weight * 3)}, "target_fat": ${Math.round(profile.weight * 0.8)} }, "motivational_message": "mensagem personalizada chamando de campeão/campeã" }`
      }
    ],
    max_tokens: 3000,
    temperature: 0.5,
    response_format: { type: 'json_object' },
  })

  return JSON.parse(response.choices[0].message.content ?? '{}')
}

// ============================================================
// COACH CHAT
// ============================================================
export async function chatWithCoach(params: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  profile: Record<string, any>
  language: string
  lastAnalysis?: string
  analysisContext?: string
  nutritionContext?: string
}): Promise<string> {
  const { messages, profile, language, lastAnalysis, analysisContext, nutritionContext } = params
  const lang = language === 'pt' ? 'pt-BR' : 'en-US'

  const chatPersonality: Record<string, string> = {
    motivational: 'Use linguagem simples e motivadora. Elogie o esforço. Finalize com uma ação concreta.',
    technical: 'Seja preciso mas acessível. Explique de forma simples.',
    raiz: 'Direto ao ponto. Linguagem simples. Sem rodeios.',
  }
  const chatTone = chatPersonality[(profile.personality_mode as string) || 'motivational'] || chatPersonality.motivational

  let systemPrompt = ELITE_COACH_PERSONA + '\n'
  systemPrompt += 'IDIOMA: ' + lang + '. SEMPRE responda em português do Brasil. NUNCA use inglês.\n'
  systemPrompt += chatTone + '\n'
  systemPrompt += 'REGRAS: linguagem simples. Máx 3 parágrafos curtos. Só fale de fitness/nutrição.\n'
  systemPrompt += 'Use os dados do atleta para respostas PERSONALIZADAS.\n'
  systemPrompt += '\nPERFIL:\n'
  systemPrompt += '- Nome: ' + (profile.name || 'Atleta') + ' | Objetivo: ' + profile.objective + ' | Nível: ' + profile.training_level + '\n'
  systemPrompt += '- Peso: ' + profile.weight + 'kg | Altura: ' + profile.height + 'cm | Idade: ' + profile.age + ' anos\n'
  systemPrompt += '- Dieta: ' + profile.current_diet + ' | Saúde: ' + (profile.health_conditions || 'sem restrições') + '\n'
  if (analysisContext) systemPrompt += '\nANÁLISE CORPORAL:\n' + analysisContext
  if (nutritionContext) systemPrompt += '\nMETAS NUTRICIONAIS:\n' + nutritionContext
  if (profile.training_plan) systemPrompt += '\nPLANO ATUAL:\n' + profile.training_plan.slice(0, 600)
  if (lastAnalysis && !analysisContext) systemPrompt += '\nANÁLISE ANTERIOR: ' + lastAnalysis.slice(0, 500)

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    max_tokens: 512,
    temperature: 0.6,
  })

  return response.choices[0].message.content ?? ''
}


// ============================================================
// MEAL / FOOD RECOGNITION
// ============================================================
export async function recognizeMeal(params: {
  description: string
  language: string
  imageBase64?: string
}): Promise<MacroResult> {
  const { description, language, imageBase64 } = params
  const lang = language === 'pt' ? 'pt-BR' : 'en-US'

  const messages: any[] = [
    { role: 'system', content: 'You are a precision nutritionist. Return ONLY valid JSON with macros. No extra text.' }
  ]

  if (imageBase64) {
    messages.push({
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + imageBase64, detail: 'low' } },
        { type: 'text', text: 'Analyze this meal photo. Return JSON: { "name": "Food Name", "calories": 350, "protein": 28, "carbs": 42, "fat": 8, "meal_type": "lunch" }. Language: ' + lang }
      ]
    })
  } else {
    messages.push({
      role: 'user',
      content: 'Food: "' + description + '". Return JSON: { "name": "Food Name", "calories": 350, "protein": 28, "carbs": 42, "fat": 8, "meal_type": "lunch" }. Be precise. Language: ' + lang
    })
  }

  const response = await openai.chat.completions.create({
    model: imageBase64 ? 'gpt-4o' : 'gpt-4o-mini',
    messages,
    max_tokens: 200,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  })

  return JSON.parse(response.choices[0].message.content ?? '{}') as MacroResult
}

// ============================================================
// FITNESS CALCULATIONS
// ============================================================
export function calculateTDEE(profile: {
  weight: number
  height: number
  age: number
  gender: string
  activity_level: string
}): number {
  const { weight, height, age, gender, activity_level } = profile

  // Mifflin-St Jeor
  let bmr = 10 * weight + 6.25 * height - 5 * age
  bmr += gender === 'male' ? 5 : -161

  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  }

  return Math.round(bmr * (multipliers[activity_level] ?? 1.55))
}

// Note: nutrition quiz fields are stored in profiles table via supabase.update()
