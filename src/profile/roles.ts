/**
 * Dual-role derivation (pure). A TenantUser is simultaneously a mentor and/or a
 * mentee — never mutually exclusive:
 *  - mentor: offers mentoring AND is not paused.
 *  - mentee: is seeking at least one skill.
 */

export interface RoleInputs {
  mentorAvailable: boolean;
  mentorPaused: boolean;
  hasSoughtSkills: boolean;
}

export interface DerivedRoles {
  isMentor: boolean;
  isMentee: boolean;
}

export function deriveRoles(input: RoleInputs): DerivedRoles {
  return {
    isMentor: input.mentorAvailable && !input.mentorPaused,
    isMentee: input.hasSoughtSkills,
  };
}

/** Effective mentoring availability (offered and not paused). */
export function isEffectivelyAvailable(mentorAvailable: boolean, mentorPaused: boolean): boolean {
  return mentorAvailable && !mentorPaused;
}
