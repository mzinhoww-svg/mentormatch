/**
 * Program rules & constants (pure).
 */
export const PROGRAM_STATUSES = ['active', 'inactive'] as const;
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

export const PARTICIPANT_ROLES = ['mentor', 'mentee', 'member'] as const;
export type ParticipantRole = (typeof PARTICIPANT_ROLES)[number];

/** The tenant's default program (created with the tenant). */
export const DEFAULT_PROGRAM = {
  name: 'Programa de Mentoria',
  description: 'Programa de mentoria padrão do tenant.',
} as const;

/** A program with free capacity can accept another participant. */
export function hasCapacity(currentActive: number, capacity: number | null): boolean {
  if (capacity === null) return true; // unlimited
  return currentActive < capacity;
}

export function isValidRole(role: string): role is ParticipantRole {
  return (PARTICIPANT_ROLES as readonly string[]).includes(role);
}
