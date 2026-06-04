/**
 * Commercial landing content (pure data). Copy follows the approved voice
 * (PT-BR, "o conhecimento circula", "passe adiante") and only describes
 * capabilities that actually exist in the product.
 */

export interface Step {
  key: string;
  title: string;
  text: string;
}

export const HOW_IT_WORKS: Step[] = [
  { key: 'mentor', title: 'Mentores se disponibilizam', text: 'Quem tem experiência cria seu perfil, oferece habilidades e define quando pode mentorar.' },
  { key: 'mentee', title: 'Mentorados buscam', text: 'Quem quer crescer registra os temas que procura e encontra a pessoa certa no diretório.' },
  { key: 'busca', title: 'Busca e filtros', text: 'Diretório de mentores com busca por nome, área e habilidade — sem planilhas.' },
  { key: 'request', title: 'Solicitação de mentoria', text: 'O mentorado solicita; o mentor aceita ou recusa. Capacidade e fila são respeitadas.' },
  { key: 'sessao', title: 'Sessões', text: 'Agende, confirme e conclua sessões dentro da mentoria — com histórico.' },
  { key: 'feedback', title: 'Feedback', text: 'Avaliação simples pós-sessão para medir e melhorar a circulação do conhecimento.' },
];

export interface Benefit {
  title: string;
  text: string;
}

export const HR_BENEFITS: Benefit[] = [
  { title: 'Retenção de conhecimento', text: 'O que mora na cabeça de poucos passa a circular — e não evapora quando alguém sai.' },
  { title: 'Sucessão', text: 'Prepara as próximas lideranças transferindo contexto e julgamento, não só processos.' },
  { title: 'Desenvolvimento interno', text: 'Trilhas de crescimento sustentadas por quem já viveu o caminho.' },
  { title: 'Aceleração de onboarding', text: 'Novas pessoas chegam à produtividade mais rápido com mentoria direcionada.' },
  { title: 'Compartilhamento de expertise', text: 'Especialistas multiplicam impacto sem se esgotar — energia que passa adiante.' },
];

export interface Plan {
  key: string;
  name: string;
  tagline: string;
  anchor: string;
  features: string[];
  highlight?: boolean;
}

/** Tiers are presentation-only (no billing). Features map to what exists today. */
export const PLANS: Plan[] = [
  {
    key: 'starter',
    name: 'Starter',
    tagline: 'Para começar a circular conhecimento.',
    anchor: 'Para times até ~50 pessoas',
    features: [
      'Programa de mentoria padrão',
      'Diretório de mentores com busca e filtros',
      'Solicitações, sessões e feedback',
      'Notificações in-app',
      'Painel administrativo essencial',
    ],
  },
  {
    key: 'growth',
    name: 'Growth',
    tagline: 'Para escalar a mentoria na empresa.',
    anchor: 'Para times de 50 a 1.000 pessoas',
    highlight: true,
    features: [
      'Tudo do Starter',
      'Branding white-label (logo e cores do tenant)',
      'Preferências e notificações por e-mail',
      'Gestão de programas e participantes',
      'Métricas operacionais no admin',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    tagline: 'Para operações multi-área e governança.',
    anchor: 'Para 1.000+ pessoas e multi-área',
    features: [
      'Tudo do Growth',
      'Isolamento multi-tenant dedicado',
      'Controles de consentimento e privacidade (LGPD)',
      'Auditoria de eventos',
      'Suporte e onboarding assistido',
    ],
  },
];

export const HEADCOUNT_OPTIONS = ['1–50', '51–200', '201–1000', '1000+'] as const;

/**
 * Method proof — honest, product-grounded numbers (no invented client logos
 * or fake testimonials). These describe how the product works, used as social
 * proof of *method* until real client metrics exist. Swap for client logos /
 * outcome metrics as soon as a pilot produces them.
 */
export interface Proof {
  k: string;
  v: string;
  note: string;
}

export const METHOD_PROOF: Proof[] = [
  { k: 'Do match ao impacto', v: '6 etapas', note: 'Perfil, busca, solicitação, sessão e feedback — num fluxo só.' },
  { k: 'Cada sessão', v: 'Com histórico', note: 'Agendada, confirmada e concluída dentro da mentoria.' },
  { k: 'Impacto', v: 'Medido', note: 'Avaliação pós-sessão alimenta as métricas do admin.' },
  { k: 'Sua marca', v: 'White-label', note: 'Logo e cores da empresa aplicados ao produto inteiro.' },
];

/** Reassurance shown under the demo form to lower submit anxiety. */
export const DEMO_REASSURANCE = 'Resposta em até 1 dia útil. Sem compromisso e sem cartão.';
