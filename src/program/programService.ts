/**
 * Program management foundation. Programs are tenant-scoped (RLS) via withTenant.
 * Every tenant has exactly one default program (ensured at tenant creation and
 * idempotently on listing). Admin manages programs; participation has simple
 * rules: the program must be active, the user active + consented, and capacity
 * (if set) not exceeded. ContactInfo is never touched here.
 */
import { withTenant, type TenantDb } from '../tenancy/withTenant.js';
import { expectedError } from '../observability/errors.js';
import { ErrorCode } from '../observability/error-codes.js';
import { recordProgramEvent } from './audit.js';
import {
  DEFAULT_PROGRAM,
  hasCapacity,
  isValidRole,
  type ParticipantRole,
  type ProgramStatus,
} from './rules.js';

export interface ProgramRecord {
  id: string;
  name: string;
  description: string | null;
  status: ProgramStatus;
  isDefault: boolean;
  capacity: number | null;
}

const SELECT_PROGRAM = `
  id, name, description, status, is_default AS "isDefault", capacity`;

/** Idempotently ensures the tenant's single default program exists; returns its id. */
export async function ensureDefaultProgram(tenantId: string): Promise<string> {
  return withTenant(tenantId, async (db) => {
    const existing = await db.query<{ id: string }>(
      'SELECT id FROM program WHERE is_default = true LIMIT 1',
    );
    if (existing.rows[0]) return existing.rows[0].id;
    const inserted = await db.query<{ id: string }>(
      `INSERT INTO program (tenant_id, name, description, status, is_default)
       VALUES ($1, $2, $3, 'active', true) RETURNING id`,
      [tenantId, DEFAULT_PROGRAM.name, DEFAULT_PROGRAM.description],
    );
    return inserted.rows[0]!.id;
  });
}

/** Lists the tenant's programs (ensuring the default exists first). */
export async function listPrograms(tenantId: string): Promise<ProgramRecord[]> {
  await ensureDefaultProgram(tenantId);
  return withTenant(tenantId, async (db) => {
    const res = await db.query<ProgramRecord>(
      `SELECT ${SELECT_PROGRAM} FROM program ORDER BY is_default DESC, created_at ASC`,
    );
    return res.rows;
  });
}

export async function getDefaultProgram(tenantId: string): Promise<ProgramRecord> {
  await ensureDefaultProgram(tenantId);
  return withTenant(tenantId, async (db) => {
    const res = await db.query<ProgramRecord>(
      `SELECT ${SELECT_PROGRAM} FROM program WHERE is_default = true LIMIT 1`,
    );
    return res.rows[0]!;
  });
}

function normalizeCapacity(capacity: number | null | undefined): number | null {
  if (capacity === null || capacity === undefined) return null;
  if (!Number.isFinite(capacity) || capacity < 0) {
    throw expectedError(ErrorCode.VALIDATION, 'invalid_capacity');
  }
  return Math.floor(capacity);
}

export interface CreateProgramInput {
  name: string;
  description?: string;
  capacity?: number | null;
}

export async function createProgram(
  tenantId: string,
  adminId: string,
  input: CreateProgramInput,
): Promise<ProgramRecord> {
  const name = (input.name ?? '').trim();
  if (!name) throw expectedError(ErrorCode.VALIDATION, 'program_name_required');
  const capacity = normalizeCapacity(input.capacity);

  const program = await withTenant(tenantId, async (db) => {
    const res = await db.query<ProgramRecord>(
      `INSERT INTO program (tenant_id, name, description, capacity)
       VALUES ($1, $2, $3, $4) RETURNING ${SELECT_PROGRAM}`,
      [tenantId, name, input.description ?? null, capacity],
    );
    return res.rows[0]!;
  });
  await recordProgramEvent(tenantId, 'program.created', {
    actorId: adminId,
    targetId: program.id,
    metadata: { name },
  });
  return program;
}

export interface UpdateProgramInput {
  name?: string;
  description?: string;
  capacity?: number | null;
}

export async function updateProgram(
  tenantId: string,
  adminId: string,
  programId: string,
  input: UpdateProgramInput,
): Promise<ProgramRecord> {
  const capacity =
    input.capacity === undefined ? undefined : normalizeCapacity(input.capacity);
  const name = input.name !== undefined ? input.name.trim() : undefined;
  if (name !== undefined && !name) throw expectedError(ErrorCode.VALIDATION, 'program_name_required');

  const program = await withTenant(tenantId, async (db) => {
    const res = await db.query<ProgramRecord>(
      `UPDATE program SET
         name = COALESCE($2, name),
         description = COALESCE($3, description),
         capacity = CASE WHEN $4::boolean THEN $5 ELSE capacity END,
         updated_at = now()
       WHERE id = $1 RETURNING ${SELECT_PROGRAM}`,
      [programId, name ?? null, input.description ?? null, input.capacity !== undefined, capacity ?? null],
    );
    if (!res.rows[0]) throw expectedError(ErrorCode.NOT_FOUND, 'program_not_found');
    return res.rows[0];
  });
  await recordProgramEvent(tenantId, 'program.updated', { actorId: adminId, targetId: programId });
  return program;
}

export async function setProgramStatus(
  tenantId: string,
  adminId: string,
  programId: string,
  status: ProgramStatus,
): Promise<void> {
  if (status !== 'active' && status !== 'inactive') {
    throw expectedError(ErrorCode.VALIDATION, 'invalid_program_status');
  }
  await withTenant(tenantId, async (db) => {
    const found = await db.query<{ is_default: boolean }>(
      'SELECT is_default FROM program WHERE id = $1',
      [programId],
    );
    const row = found.rows[0];
    if (!row) throw expectedError(ErrorCode.NOT_FOUND, 'program_not_found');
    // The default program must always exist and stay usable.
    if (row.is_default && status === 'inactive') {
      throw expectedError(ErrorCode.CONFLICT, 'cannot_deactivate_default');
    }
    await db.query('UPDATE program SET status = $2, updated_at = now() WHERE id = $1', [
      programId,
      status,
    ]);
  });
  await recordProgramEvent(tenantId, 'program.status_changed', {
    actorId: adminId,
    targetId: programId,
    metadata: { status },
  });
}

export interface ParticipantRecord {
  id: string;
  tenantUserId: string;
  displayName: string | null;
  roleInProgram: ParticipantRole;
  status: string;
}

export async function listParticipants(
  tenantId: string,
  programId: string,
): Promise<ParticipantRecord[]> {
  return withTenant(tenantId, async (db) => {
    const res = await db.query<ParticipantRecord>(
      `SELECT pp.id, pp.tenant_user_id AS "tenantUserId", u.display_name AS "displayName",
              pp.role_in_program AS "roleInProgram", pp.status
       FROM program_participant pp
       JOIN tenant_user u ON u.id = pp.tenant_user_id
       WHERE pp.program_id = $1
       ORDER BY pp.joined_at ASC`,
      [programId],
    );
    return res.rows;
  });
}

async function countActiveParticipants(db: TenantDb, programId: string): Promise<number> {
  const res = await db.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM program_participant WHERE program_id = $1 AND status = 'active'",
    [programId],
  );
  return res.rows[0]?.n ?? 0;
}

export async function addParticipant(
  tenantId: string,
  adminId: string,
  programId: string,
  userId: string,
  roleInProgram: string = 'member',
): Promise<ParticipantRecord> {
  if (!isValidRole(roleInProgram)) {
    throw expectedError(ErrorCode.VALIDATION, 'invalid_participant_role');
  }

  const participant = await withTenant(tenantId, async (db) => {
    const program = await db.query<{ status: string; capacity: number | null }>(
      'SELECT status, capacity FROM program WHERE id = $1',
      [programId],
    );
    const prog = program.rows[0];
    if (!prog) throw expectedError(ErrorCode.NOT_FOUND, 'program_not_found');
    if (prog.status !== 'active') throw expectedError(ErrorCode.CONFLICT, 'program_inactive');

    // Participation rule: the user must be active and have recorded consent.
    const user = await db.query<{ status: string }>(
      'SELECT status FROM tenant_user WHERE id = $1',
      [userId],
    );
    if (!user.rows[0]) throw expectedError(ErrorCode.NOT_FOUND, 'user_not_found');
    if (user.rows[0].status !== 'active') {
      throw expectedError(ErrorCode.CONFLICT, 'user_not_active');
    }
    const consent = await db.query(
      'SELECT 1 FROM consent_record WHERE tenant_user_id = $1 LIMIT 1',
      [userId],
    );
    if (consent.rowCount === 0) throw expectedError(ErrorCode.VALIDATION, 'consent_required');

    // Capacity rule (if a capacity is set).
    if (!hasCapacity(await countActiveParticipants(db, programId), prog.capacity)) {
      throw expectedError(ErrorCode.CONFLICT, 'program_full');
    }

    const existing = await db.query(
      "SELECT 1 FROM program_participant WHERE program_id = $1 AND tenant_user_id = $2 AND status = 'active'",
      [programId, userId],
    );
    if (existing.rowCount > 0) throw expectedError(ErrorCode.CONFLICT, 'already_participant');

    const res = await db.query<ParticipantRecord>(
      `INSERT INTO program_participant (tenant_id, program_id, tenant_user_id, role_in_program)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tenant_id, program_id, tenant_user_id) DO UPDATE
         SET status = 'active', role_in_program = EXCLUDED.role_in_program
       RETURNING id, tenant_user_id AS "tenantUserId", role_in_program AS "roleInProgram", status`,
      [tenantId, programId, userId, roleInProgram],
    );
    return res.rows[0]!;
  });
  await recordProgramEvent(tenantId, 'program.participant_added', {
    actorId: adminId,
    targetId: programId,
    metadata: { userId, roleInProgram },
  });
  return participant;
}

export async function removeParticipant(
  tenantId: string,
  adminId: string,
  programId: string,
  userId: string,
): Promise<void> {
  const res = await withTenant(tenantId, (db) =>
    db.query(
      "UPDATE program_participant SET status = 'left' WHERE program_id = $1 AND tenant_user_id = $2 AND status = 'active'",
      [programId, userId],
    ),
  );
  if (res.rowCount === 0) throw expectedError(ErrorCode.NOT_FOUND, 'participant_not_found');
  await recordProgramEvent(tenantId, 'program.participant_removed', {
    actorId: adminId,
    targetId: programId,
    metadata: { userId },
  });
}
