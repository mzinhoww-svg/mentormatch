/**
 * Human-readable PT-BR labels for notification types, shared by the
 * notifications screen and the settings preferences screen so both speak the
 * same language (no raw event keys shown to users).
 */
export const NOTIFICATION_LABELS: Record<string, string> = {
  'mentorship.requested': 'Nova solicitação de mentoria',
  'mentorship.accepted': 'Mentoria aceita',
  'mentorship.rejected': 'Solicitação recusada',
  'mentorship.cancelled': 'Solicitação cancelada',
  'session.requested': 'Sessão solicitada',
  'session.confirmed': 'Sessão confirmada',
  'session.completed': 'Sessão concluída',
  'session.cancelled': 'Sessão cancelada',
  'auth.login': 'Novo acesso à conta',
  'auth.logout': 'Sessão encerrada',
  'consent.recorded': 'Consentimento registrado',
  'profile.updated': 'Perfil atualizado',
  'profile.capacity_changed': 'Capacidade alterada',
};

export function notificationLabel(type: string): string {
  return NOTIFICATION_LABELS[type] ?? type;
}
