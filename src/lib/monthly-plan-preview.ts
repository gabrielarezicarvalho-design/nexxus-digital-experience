// Display copy for the monthly subscriptions; checkout uses the matching plans.code.
export const monthlyPlanPreviews = [
  { id: 'pro', code: 'cc_monthly_pro', name: 'Pro', priceCents: 8990, description: 'Para quem usa IA no trabalho e nos estudos.', models: ['Claude Haiku 5.5', 'Claude Sonnet 5.5', 'DeepSeek V4.1 Flash'], extras: ['1M contexto em todos os modelos', 'Resposta rápida, sem fila de espera'], tail: ['Suporte por e-mail'], featured: true },
  { id: 'max', code: 'cc_monthly_max', name: 'Max', priceCents: 16490, description: 'Para projetos maiores e uma rotina intensa com IA.', models: ['Tudo do plano Pro', 'Claude Opus 5.5', 'Claude Fable 5.1'], extras: ['1M contexto em todos os modelos', '20 RPM, com controle de spam'], tail: ['Suporte via Whatsapp'], featured: false },
  { id: 'enterprise', code: 'cc_monthly_enterprise', name: 'Enterprise', priceCents: 65000, description: 'Para operações profissionais e equipes em crescimento.', models: ['Tudo do plano Max', 'GPT-6 Astra', 'Gemini 4 Argon'], extras: ['1M contexto em todos os modelos', '25 RPM — demanda altíssima', 'Máxima velocidade de resposta'], tail: ['Suporte VIP'], featured: false },
  { id: 'teams', code: 'cc_monthly_teams', name: 'Teams', priceCents: 145000, description: 'Para empresas com alta demanda e projetos em equipe.', models: ['Tudo do plano Enterprise', 'Claude Fable 5.2, exclusivo Teams'], extras: ['1M contexto em todos os modelos', '30 RPM — demanda altíssima', 'ultra velocidade nas respostas'], tail: ['Suporte prioritário'], featured: false },
] as const;

// GPT-only monthly subscriptions: same prices and limits as the Claude ones, GPT models in a ladder.
export const gptMonthlyPlanPreviews = [
  { id: 'gpt-pro', code: 'cc_monthly_gpt_pro', name: 'GPT Pro', priceCents: 8990, description: 'Para quem usa IA no trabalho e nos estudos.', models: ['GPT-6 Luna', 'GPT-6 Sol'], extras: ['Resposta rápida, sem fila de espera'], tail: ['Suporte por e-mail'], featured: true },
  { id: 'gpt-max', code: 'cc_monthly_gpt_max', name: 'GPT Max', priceCents: 16490, description: 'Para projetos maiores e uma rotina intensa com IA.', models: ['Tudo do plano Pro', 'GPT-6.1 Terra', 'GPT-6.1 Sol'], extras: ['20 RPM, com controle de spam'], tail: ['Suporte via Whatsapp'], featured: false },
  { id: 'gpt-enterprise', code: 'cc_monthly_gpt_enterprise', name: 'GPT Enterprise', priceCents: 18000, originalCents: 45000, description: 'Para operações profissionais e equipes em crescimento.', models: ['Tudo do plano Max', 'GPT-6 Astra'], extras: ['1M contexto em todos os modelos', '25 RPM — demanda altíssima', 'Máxima velocidade de resposta'], tail: ['Suporte VIP'], featured: false },
  { id: 'gpt-teams', code: 'cc_monthly_gpt_teams', name: 'GPT Teams', priceCents: 28990, originalCents: 99990, description: 'Para empresas com alta demanda e projetos em equipe.', models: ['Tudo do plano Enterprise', 'Todos os modelos GPT, inclusive os novos'], extras: ['1M contexto em todos os modelos', '30 RPM — demanda altíssima', 'ultra velocidade nas respostas'], tail: ['Suporte prioritário'], featured: false },
] as const;

export function monthlyPreviewCanCheckout() { return true; }