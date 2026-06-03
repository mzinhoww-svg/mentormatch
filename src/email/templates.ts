/**
 * Transactional email templates (pure rendering). Keyed by the domain
 * notification type that triggers them. Templates use ONLY a small, whitelisted
 * context (recipient's own name, tenant display name, app link) — never the raw
 * event payload — so ContactInfo and other sensitive data can never leak into an
 * email by construction.
 */
import type { NotificationType } from '../notifications/types.js';

export interface TemplateContext {
  recipientName: string | null;
  tenantName: string;
  appUrl: string;
}

export interface RenderedEmail {
  templateKey: string;
  subject: string;
  body: string;
}

type TemplateFn = (ctx: TemplateContext) => { subject: string; body: string };

function greeting(ctx: TemplateContext): string {
  return ctx.recipientName ? `Olá, ${ctx.recipientName}.` : 'Olá.';
}
function footer(ctx: TemplateContext): string {
  return `\n\nAbra o MentorMatch para ver os detalhes: ${ctx.appUrl}\n\n— ${ctx.tenantName} · Passe adiante.`;
}

/** Only these events produce email. The map key is also the template key. */
const TEMPLATES: Partial<Record<NotificationType, TemplateFn>> = {
  'mentorship.requested': (c) => ({
    subject: 'Você recebeu uma nova solicitação de mentoria',
    body: `${greeting(c)}\n\nVocê recebeu uma nova solicitação de mentoria. Revise e responda quando puder.${footer(c)}`,
  }),
  'mentorship.accepted': (c) => ({
    subject: 'Sua solicitação de mentoria foi aceita',
    body: `${greeting(c)}\n\nBoa notícia: sua solicitação de mentoria foi aceita. A mentoria já está ativa.${footer(c)}`,
  }),
  'mentorship.rejected': (c) => ({
    subject: 'Atualização sobre sua solicitação de mentoria',
    body: `${greeting(c)}\n\nSua solicitação de mentoria não pôde ser aceita desta vez. Você pode buscar outro mentor no diretório.${footer(c)}`,
  }),
  'mentorship.cancelled': (c) => ({
    subject: 'Uma solicitação de mentoria foi cancelada',
    body: `${greeting(c)}\n\nUma solicitação de mentoria foi cancelada.${footer(c)}`,
  }),
  'session.requested': (c) => ({
    subject: 'Nova sessão de mentoria solicitada',
    body: `${greeting(c)}\n\nUma sessão de mentoria foi solicitada. Confirme um horário quando puder.${footer(c)}`,
  }),
  'session.confirmed': (c) => ({
    subject: 'Sua sessão de mentoria foi confirmada',
    body: `${greeting(c)}\n\nSua sessão de mentoria foi confirmada.${footer(c)}`,
  }),
  'session.completed': (c) => ({
    subject: 'Sessão de mentoria concluída',
    body: `${greeting(c)}\n\nUma sessão de mentoria foi concluída. Se quiser, deixe sua avaliação.${footer(c)}`,
  }),
  'session.cancelled': (c) => ({
    subject: 'Uma sessão de mentoria foi cancelada',
    body: `${greeting(c)}\n\nUma sessão de mentoria foi cancelada.${footer(c)}`,
  }),
};

export function isEmailableEvent(type: string): type is NotificationType {
  return Object.prototype.hasOwnProperty.call(TEMPLATES, type);
}

export const EMAILABLE_TYPES = Object.keys(TEMPLATES) as NotificationType[];

/** Renders the template for a type, or null when the type produces no email. */
export function renderTemplate(type: string, ctx: TemplateContext): RenderedEmail | null {
  const fn = TEMPLATES[type as NotificationType];
  if (!fn) return null;
  const { subject, body } = fn(ctx);
  return { templateKey: type, subject, body };
}
