/**
 * Tenant employee landing copy — a replicable, personalized generator (pure, no
 * I/O). Given a tenant's program/company names it produces the full copy for the
 * employee-facing landing of an ALREADY-CONTRACTED program, following the
 * "elite copywriter" brief: zero focus on the host platform as a product, 100%
 * on the benefit the company offers, an exclusive free perk, an invitation to a
 * development journey, and a login-focused CTA.
 *
 * When the tenant has no custom program name (still the MentorMatch default), the
 * copy leans on generic program characteristics (skills you can develop, how it
 * works) so it reads well out of the box. Richer per-tenant content (niche,
 * transformation, …) can be layered later — see docs/LANDING-PROMPT.md.
 */
export interface TenantLandingInput {
  /** The tenant's program name (e.g. "Trilhas de Liderança"); may be the default. */
  programName: string;
  /** The contracting company's display name; null falls back to "sua empresa". */
  companyName: string | null;
  /** True when programName is a real custom name (not the kit default). */
  hasCustomProgram: boolean;
}

export interface LandingStep {
  title: string;
  text: string;
}
export interface LandingStory {
  quote: string;
  author: string;
  role: string;
}

export interface TenantLandingCopy {
  hero: { headline: string; subheadline: string; cta: string; visualHint: string };
  nextLevel: { title: string; paragraphs: string[] };
  experience: { title: string; intro: string; steps: LandingStep[] };
  skills: { title: string; intro: string; items: string[] };
  community: { title: string; paragraphs: string[] };
  stories: { title: string; items: LandingStory[] };
  finalCta: { title: string; subtitle: string; cta: string };
}

/** The development areas a mentee can grow in — the platform's generic value,
 *  used as the "what you can develop" content (esp. without a custom program). */
const DEFAULT_SKILLS: readonly string[] = [
  'Liderança e gestão de pessoas',
  'Comunicação e influência',
  'Carreira, propósito e próximos passos',
  'Habilidades técnicas da sua área',
  'Networking e relacionamento interno',
  'Tomada de decisão sob pressão',
];

export function buildTenantLanding(input: TenantLandingInput): TenantLandingCopy {
  const company = input.companyName?.trim() || 'sua empresa';
  const program = input.programName?.trim() || 'Programa de Mentoria';
  // Phrase the program naturally: a real custom name is referenced by name; the
  // default falls back to a descriptive phrase.
  const programRef = input.hasCustomProgram ? program : 'o programa de mentoria';

  return {
    hero: {
      headline: `A ${company} investe no seu futuro. Sua mentoria exclusiva já está liberada.`,
      subheadline: `Um benefício preparado pela ${company} para acelerar a sua carreira: conexão direta com mentores experientes, no seu tempo e sem nenhum custo para você. ${input.hasCustomProgram ? `Conheça ${program} por dentro.` : 'Descubra o que você pode desenvolver.'}`,
      cta: 'Acessar meu programa',
      visualHint:
        'Fundo claro com a cor primária da marca; logo da empresa em destaque; pessoas reais colaborando/aprendendo, ou o símbolo da marca em grande. Botão de acesso bem visível.',
    },
    nextLevel: {
      title: 'Existe um próximo nível esperando por você',
      paragraphs: [
        `Onde você quer estar daqui a um ano? Há conversas, repertório e decisões que separam o seu momento atual do seu próximo passo — e raramente aprendemos isso sozinhos.`,
        `A ${company} decidiu encurtar esse caminho para você: colocou à sua disposição quem já trilhou essa estrada. As ferramentas estão na mesa. A evolução é uma escolha sua — e ela já está custeada.`,
      ],
    },
    experience: {
      title: 'Como funciona, por dentro',
      intro:
        'Nada de cursos intermináveis. É uma jornada guiada, no seu ritmo, com pessoas de verdade ao seu lado.',
      steps: [
        { title: 'Encontre o mentor certo', text: 'Busque por área, habilidade ou objetivo e veja quem pode te ajudar agora.' },
        { title: 'Solicite a conexão', text: 'Em um clique você pede a mentoria. Simples, direto, sem burocracia.' },
        { title: 'Agende suas sessões', text: 'Conversas com hora marcada, no seu tempo, focadas no que importa para você.' },
        { title: 'Evolua com acompanhamento', text: 'Registre objetivos, receba feedback e acompanhe o seu progresso ao longo da jornada.' },
      ],
    },
    skills: {
      title: 'O que você pode desenvolver',
      intro: input.hasCustomProgram
        ? `Dentro de ${program}, você avança nas competências que destravam a sua carreira:`
        : 'Escolha onde quer crescer — e encontre quem já domina esse caminho:',
      items: [...DEFAULT_SKILLS],
    },
    community: {
      title: 'Você não cresce sozinho',
      paragraphs: [
        `Mais do que acessar conteúdo, você entra para um movimento de pessoas que escolheram evoluir dentro da ${company}.`,
        `Troque experiências, amplie sua rede por dentro da empresa e descubra que aprender com colegas e líderes é o atalho mais poderoso para o crescimento coletivo.`,
      ],
    },
    stories: {
      title: 'Quem já está aproveitando',
      items: [
        {
          quote: `Achei que seria mais um benefício esquecido. Na primeira sessão entendi o tamanho da oportunidade — em semanas mudei a forma como conduzo meu time.`,
          author: 'Colaborador(a)',
          role: `${company}`,
        },
        {
          quote: `Ter alguém experiente para me ouvir e provocar fez toda a diferença. ${programRef.charAt(0).toUpperCase() + programRef.slice(1)} me deu clareza sobre os meus próximos passos.`,
          author: 'Colaborador(a)',
          role: `${company}`,
        },
      ],
    },
    finalCta: {
      title: 'Seu crescimento começa agora',
      subtitle: `A ${company} já fez a parte dela e liberou esse benefício para você. O próximo passo é seu — e leva só um login.`,
      cta: 'Entrar e começar',
    },
  };
}
