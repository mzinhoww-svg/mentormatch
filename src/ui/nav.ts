/**
 * Primary navigation config (pure). Admin-only items are filtered out for
 * non-admin roles, mirroring the back-end's requireAdmin gating.
 */
export interface NavItem {
  href: string;
  label: string;
  icon: string;
  admin?: boolean;
}

export const ADMIN_ROLES = ['admin', 'program_manager'];

export const NAV_ITEMS: NavItem[] = [
  { href: '/app', label: 'Início', icon: 'home' },
  { href: '/app/profile', label: 'Perfil', icon: 'user' },
  { href: '/app/mentors', label: 'Mentores', icon: 'compass' },
  { href: '/app/requests', label: 'Solicitações', icon: 'inbox' },
  { href: '/app/mentorships', label: 'Mentorias', icon: 'link' },
  { href: '/app/sessions', label: 'Sessões', icon: 'calendar' },
  { href: '/app/notifications', label: 'Notificações', icon: 'bell' },
  { href: '/app/admin', label: 'Admin', icon: 'shield', admin: true },
  { href: '/app/settings', label: 'Configurações', icon: 'settings' },
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
