/**
 * Primary navigation config (pure). Admin-only items are filtered out for
 * non-admin roles, mirroring the back-end's requireAdmin gating.
 */
export interface NavItem {
  href: string;
  label: string;
  admin?: boolean;
}

export const ADMIN_ROLES = ['admin', 'program_manager'];

export const NAV_ITEMS: NavItem[] = [
  { href: '/app', label: 'Início' },
  { href: '/app/profile', label: 'Perfil' },
  { href: '/app/mentors', label: 'Mentores' },
  { href: '/app/requests', label: 'Solicitações' },
  { href: '/app/mentorships', label: 'Mentorias' },
  { href: '/app/sessions', label: 'Sessões' },
  { href: '/app/notifications', label: 'Notificações' },
  { href: '/app/admin', label: 'Admin', admin: true },
  { href: '/app/settings', label: 'Configurações' },
];

export function isAdminRole(role: string | undefined | null): boolean {
  return ADMIN_ROLES.includes(role ?? '');
}

export function navForRole(role: string | undefined | null): NavItem[] {
  const admin = isAdminRole(role);
  return NAV_ITEMS.filter((i) => !i.admin || admin);
}

/** Active nav item = the deepest matching href for the current path. */
export function activeHref(pathname: string): string {
  const matches = NAV_ITEMS.filter(
    (i) => pathname === i.href || pathname.startsWith(i.href + '/'),
  ).map((i) => i.href);
  return matches.sort((a, b) => b.length - a.length)[0] ?? '/app';
}
